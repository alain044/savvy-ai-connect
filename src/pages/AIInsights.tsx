import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Brain, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTIONS = [
  { icon: Wallet, text: 'How can I improve my monthly budget?' },
  { icon: TrendingUp, text: 'How diversified is my portfolio?' },
  { icon: Brain, text: 'Suggest a savings + investing strategy for me' },
  { icon: Sparkles, text: 'What are my biggest financial risks right now?' },
];

const readJson = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};

const AIInsights = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('holdings').select('symbol,name,shares,avg_price,asset_type').then(({ data }) => {
      setPortfolio(data ?? []);
    });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildFinanceSnapshot = () => {
    const expenses = readJson<any[]>('savvy_expenses', []);
    const budgets = readJson<any[]>('savvy_budgets', []);
    const goals = readJson<any[]>('savvy_savings', []);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalExpense = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount || 0), 0);
    return {
      monthly_income: totalIncome,
      monthly_spending: totalExpense,
      net_cashflow: totalIncome - totalExpense,
      recent_transactions: expenses.slice(-10),
      budgets,
      savings_goals: goals,
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ messages: newMessages, portfolio, finance: buildFinanceSnapshot() }),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error ?? 'AI request failed');
        setLoading(false);
        return;
      }

      const reader = r.body?.getReader();
      const decoder = new TextDecoder();
      let assistant = '';
      let buffer = '';
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: assistant };
                return copy;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-[calc(100vh-3rem)] max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <p className="text-sm text-muted-foreground">
            Unified finance & portfolio advisor • {portfolio.length} holdings • Educational only
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-3 rounded-full bg-accent">
                <Sparkles className="w-10 h-10 text-accent-foreground" />
              </div>
              <p className="text-muted-foreground max-w-md">
                Ask anything about your money — I see your expenses, budgets, savings goals, and investment portfolio together.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {SUGGESTIONS.map(({ icon: Icon, text }) => (
                  <Button key={text} variant="outline" size="sm"
                    className="text-left justify-start h-auto py-2 gap-2"
                    onClick={() => send(text)}>
                    <Icon className="w-4 h-4 shrink-0 text-primary" />
                    <span className="text-xs">{text}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                      <ReactMarkdown>{m.content || (loading && i === messages.length - 1 ? '...' : '')}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
        <div className="border-t border-border p-3 flex gap-2">
          <Input placeholder="Ask about your finances or portfolio..." value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            disabled={loading} />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AIInsights;
