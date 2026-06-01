import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipForward, AudioLines } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BRIEFINGS = [
  {
    t: 'Executive Daily Briefing',
    d: '1:42',
    text:
      'Monthly revenue increased by 12%. Three high-risk transactions detected. Procurement expenses exceeded the planned budget.',
  },
  {
    t: 'Cash Flow Summary',
    d: '0:58',
    text: 'Cash inflow trending positive across Q3. Forecast for next month: $412K net positive.',
  },
  {
    t: 'Risk Digest',
    d: '1:14',
    text: 'Two suppliers showing anomalous behavior. Copilot recommends review by end of day.',
  },
];

function Waveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-10">
      {Array.from({ length: 32 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-primary"
          style={{
            height: `${20 + Math.abs(Math.sin(i * 0.6)) * 70}%`,
            animation: playing ? `wfPulse 0.${(i % 5) + 4}s ease-in-out ${i * 30}ms infinite alternate` : 'none',
            opacity: playing ? 1 : 0.35,
          }}
        />
      ))}
      <style>{`@keyframes wfPulse{from{transform:scaleY(.4)}to{transform:scaleY(1)}}`}</style>
    </div>
  );
}

export default function VoiceBriefings() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggle = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(BRIEFINGS[active].text);
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };

  const next = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setActive((a) => (a + 1) % BRIEFINGS.length);
  };

  const current = BRIEFINGS[active];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AudioLines className="w-4 h-4 text-primary" /> AI Voice Briefings
          </CardTitle>
          <span className="text-xs text-muted-foreground">{current.d}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="size-16 rounded-full bg-primary grid place-items-center shadow-lg">
                <AudioLines className={cn('w-7 h-7 text-primary-foreground', playing && 'animate-pulse')} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{current.t}</div>
              <div className="mt-2"><Waveform playing={playing} /></div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{current.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={toggle} size="sm" className="gap-2">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? 'Pause' : 'Play briefing'}
            </Button>
            <Button onClick={next} size="sm" variant="outline" className="gap-2">
              <SkipForward className="w-4 h-4" /> Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {BRIEFINGS.map((b, i) => (
            <button
              key={b.t}
              onClick={() => {
                window.speechSynthesis?.cancel();
                setPlaying(false);
                setActive(i);
              }}
              className={cn(
                'text-left rounded-lg border p-3 transition-all hover:bg-accent/40',
                i === active && 'border-primary ring-1 ring-primary/40'
              )}
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Briefing</div>
              <div className="mt-1 text-sm font-medium leading-tight">{b.t}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{b.d}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
