import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Check, X, Copy, Users, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/components/ui/sonner';

interface MembershipRequest {
  id: string;
  user_id: string;
  status: string;
  message: string;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export const MembershipRequests = () => {
  const { user } = useAuth();
  const { organization, role } = useOrganization();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const isAdmin = role === 'owner' || role === 'accountant';

  const loadJoinCode = useCallback(async () => {
    if (!organization) return;
    const { data } = await supabase
      .from('organizations')
      .select('join_code')
      .eq('id', organization.id)
      .maybeSingle();
    if (data?.join_code) setCode(data.join_code);
  }, [organization]);

  const fetchRequests = useCallback(async () => {
    if (!organization || !isAdmin) { setLoading(false); return; }
    setLoading(true);
    const { data: reqs } = await supabase
      .from('membership_requests')
      .select('id, user_id, status, message, created_at')
      .eq('organization_id', organization.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests((reqs ?? []) as MembershipRequest[]);

    const userIds = (reqs ?? []).map((r) => r.user_id);
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((p) => { map[p.user_id] = p as ProfileLite; });
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }, [organization, isAdmin]);

  useEffect(() => {
    loadJoinCode();
    fetchRequests();
  }, [loadJoinCode, fetchRequests]);

  // Realtime updates for new requests
  useEffect(() => {
    if (!organization || !isAdmin) return;
    const channel = supabase
      .channel('membership-requests-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membership_requests', filter: `organization_id=eq.${organization.id}` },
        () => fetchRequests(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organization, isAdmin, fetchRequests]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    setActing(id);
    const { error } = await supabase
      .from('membership_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(status === 'approved' ? 'Member approved' : 'Request rejected');
    fetchRequests();
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success('Join code copied');
  };

  if (!organization) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4" /> Organization access
        </CardTitle>
        <CardDescription>
          Share the join code with new members and review their requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Join code</p>
            <p className="text-lg font-mono font-semibold tracking-widest">{code || '—'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={copyCode} disabled={!code}>
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
        </div>

        {!isAdmin ? (
          <p className="text-sm text-muted-foreground">Only owners and accountants can review join requests.</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const p = profiles[req.user_id];
              return (
                <div key={req.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p?.full_name || p?.email || 'Pending user'}
                    </p>
                    {p?.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
                    {req.message && <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="hidden sm:inline-flex">Pending</Badge>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAction(req.id, 'approved')}
                      disabled={acting === req.id}
                    >
                      {acting === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(req.id, 'rejected')}
                      disabled={acting === req.id}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
