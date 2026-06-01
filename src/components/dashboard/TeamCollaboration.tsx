import { useState } from 'react';
import { Send, AtSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PEOPLE = [
  { n: 'Amara Osei', r: 'CFO', on: true },
  { n: 'Daniel Kim', r: 'Controller', on: true },
  { n: 'Sophia Müller', r: 'Finance Head', on: true },
  { n: 'Jonas Park', r: 'Auditor', on: false },
  { n: 'Priya Nair', r: 'Treasurer', on: true },
];

const INITIAL = [
  { user: 'Amara', text: 'Flagged INV-2041 for your review — vendor change last week.', time: '09:12' },
  { user: 'Daniel', text: 'Looks fine, totals reconcile with PO-887.', time: '09:18' },
  { user: 'Sophia', text: '@Daniel can you confirm tax line before approval?', time: '09:24' },
];

const now = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export default function TeamCollaboration() {
  const [msgs, setMsgs] = useState(INITIAL);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const send = () => {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { user: 'You', text: input, time: now() }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { user: 'Daniel', text: 'Got it — looking now.', time: now() }]);
    }, 1400);
  };

  const onlineCount = PEOPLE.filter((p) => p.on).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Team Collaboration
          </CardTitle>
          <span className="text-xs text-muted-foreground">{onlineCount} online</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ul className="space-y-1.5 md:col-span-1">
            {PEOPLE.map((p) => (
              <li key={p.n} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition">
                <div className="relative">
                  <div className="size-8 rounded-full bg-primary/15 text-primary grid place-items-center text-[11px] font-semibold">
                    {p.n.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-card',
                      p.on ? 'bg-emerald-500' : 'bg-muted-foreground'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight truncate">{p.n}</div>
                  <div className="text-[11px] text-muted-foreground">{p.r}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="md:col-span-2 flex flex-col rounded-lg border bg-background/50">
            <div className="px-3 py-2 border-b">
              <div className="text-sm font-medium">INV-2041 · Helix Supplies</div>
              <div className="text-[11px] text-muted-foreground">Threaded discussion</div>
            </div>
            <div className="flex-1 p-3 space-y-3 max-h-[260px] overflow-y-auto">
              {msgs.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-semibold">
                    {m.user.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{m.user}</span>
                      <span className="text-[11px] text-muted-foreground">{m.time}</span>
                    </div>
                    <div className="text-sm mt-0.5 text-foreground/90">{m.text}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2 items-center text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full bg-foreground/40 animate-bounce"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                  Daniel is typing…
                </div>
              )}
            </div>
            <div className="p-2 border-t flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0">
                <AtSign className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Write a comment, @mention a teammate…"
                className="h-9"
              />
              <Button size="icon" onClick={send} className="h-9 w-9 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
