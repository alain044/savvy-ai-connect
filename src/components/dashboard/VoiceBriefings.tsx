import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipForward, AudioLines, Plus, Search, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import AccessDenied from '@/components/AccessDenied';
import { toast } from '@/components/ui/sonner';

type Briefing = {
  id: string;
  title: string;
  script: string;
  audio_url: string | null;
  duration_seconds: number;
  created_at: string;
  created_by: string;
};

function Waveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full bg-primary"
          style={{
            height: `${20 + Math.abs(Math.sin(i * 0.6)) * 70}%`,
            animation: playing ? `wfPulse 0.${(i % 5) + 4}s ease-in-out ${i * 30}ms infinite alternate` : 'none',
            opacity: playing ? 1 : 0.35,
          }} />
      ))}
      <style>{`@keyframes wfPulse{from{transform:scaleY(.4)}to{transform:scaleY(1)}}`}</style>
    </div>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function VoiceBriefings() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { canView, canManage } = useModuleAccess('voice_briefings');
  const PAGE_SIZE = 10;
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'played' | 'unplayed'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', script: '' });
  const [saving, setSaving] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const fetchPage = async (from: number) => {
    if (!organization || !user) return { items: [] as Briefing[], end: true };
    let q = supabase
      .from('voice_briefings')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
    const { data } = await q;
    const items = (data ?? []) as Briefing[];
    return { items, end: items.length < PAGE_SIZE };
  };

  useEffect(() => {
    if (!user || !organization || !canView) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ items, end }, { data: plays }] = await Promise.all([
        fetchPage(0),
        supabase.from('voice_briefing_plays').select('briefing_id').eq('user_id', user.id),
      ]);
      if (cancelled) return;
      setBriefings(items);
      setHasMore(!end);
      setPlayedIds(new Set((plays ?? []).map((p: any) => p.briefing_id)));
      if (items.length) setActiveId(items[0].id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, organization, canView, search]);

  const loadMore = async () => {
    setLoadingMore(true);
    const { items, end } = await fetchPage(briefings.length);
    setBriefings((prev) => [...prev, ...items]);
    setHasMore(!end);
    setLoadingMore(false);
  };

  const clearFilters = () => { setSearch(''); setFilter('all'); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return briefings;
    return briefings.filter((b) => b.title.toLowerCase().includes(q) || b.script.toLowerCase().includes(q));
  }, [briefings, search]);

  const current = briefings.find((b) => b.id === activeId) ?? filtered[0] ?? null;

  const recordPlay = async (briefing: Briefing, completed: boolean) => {
    if (!user) return;
    setPlayedIds((prev) => new Set(prev).add(briefing.id));
    await supabase.from('voice_briefing_plays').insert({
      briefing_id: briefing.id, user_id: user.id, completed,
    });
  };

  const toggle = () => {
    if (!current || typeof window === 'undefined' || !window.speechSynthesis) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(current.script || current.title);
    u.onend = () => { setPlaying(false); recordPlay(current, true); };
    u.onerror = () => setPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
    recordPlay(current, false);
  };

  const next = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    if (!filtered.length) return;
    const idx = filtered.findIndex((b) => b.id === current?.id);
    setActiveId(filtered[(idx + 1) % filtered.length].id);
  };

  const createBriefing = async () => {
    if (!user || !organization || !form.title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('voice_briefings').insert({
      organization_id: organization.id,
      created_by: user.id,
      title: form.title.trim(),
      script: form.script.trim(),
      duration_seconds: Math.max(15, Math.round(form.script.split(/\s+/).length / 2.5)),
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setBriefings((prev) => [data as Briefing, ...prev]);
    setActiveId((data as Briefing).id);
    setForm({ title: '', script: '' });
    setOpen(false);
    toast.success('Briefing created');
  };

  if (!canView) return <AccessDenied message="You don't have access to AI Voice Briefings." />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <AudioLines className="w-4 h-4 text-primary" /> AI Voice Briefings
          </CardTitle>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New voice briefing</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <Textarea rows={6} placeholder="Briefing script…" value={form.script}
                    onChange={(e) => setForm({ ...form, script: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={createBriefing} disabled={saving || !form.title.trim()}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : current ? (
          <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
            <div className="flex items-center gap-4">
              <div className="size-14 sm:size-16 rounded-full bg-primary grid place-items-center shadow-lg shrink-0">
                <AudioLines className={cn('w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground', playing && 'animate-pulse')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{current.title}</div>
                <div className="mt-2"><Waveform playing={playing} /></div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">{current.script}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button onClick={toggle} size="sm" className="gap-2">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? 'Pause' : 'Play briefing'}
              </Button>
              <Button onClick={next} size="sm" variant="outline" className="gap-2" disabled={filtered.length < 2}>
                <SkipForward className="w-4 h-4" /> Next
              </Button>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fmtDate(current.created_at)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No briefings yet.{canManage && ' Click "New" to create one.'}
          </p>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search briefings…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto">
          {filtered.map((b) => {
            const played = playedIds.has(b.id);
            return (
              <button key={b.id}
                onClick={() => { window.speechSynthesis?.cancel(); setPlaying(false); setActiveId(b.id); }}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-all hover:bg-accent/40',
                  b.id === current?.id && 'border-primary ring-1 ring-primary/40'
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight truncate">{b.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {fmtDate(b.created_at)}
                    </div>
                  </div>
                  {played && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" /> Played
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No matches.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
