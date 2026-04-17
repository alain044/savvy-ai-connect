import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Holding {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  shares: number;
  avg_price: number;
  notes: string | null;
}

interface Quote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  shortName?: string;
}

const PortfolioPage = () => {
  const { user } = useAuth();
  const { format, currency } = useCurrency();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ symbol: '', name: '', asset_type: 'stock', shares: '', avg_price: '' });

  const fetchHoldings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('holdings').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setHoldings(data ?? []);
    setLoading(false);
  }, [user]);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-quotes', {
        method: 'GET',
        // @ts-expect-error supabase-js v2 supports this for GET
        body: undefined,
      });
      // Use direct fetch for query params
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-quotes?action=quotes&symbols=${encodeURIComponent(symbols.join(','))}`;
      const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const json = await r.json();
      const map: Record<string, Quote> = {};
      (json.quotes ?? []).forEach((q: Quote) => { map[q.symbol] = q; });
      setQuotes(map);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch quotes');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);
  useEffect(() => {
    if (holdings.length) fetchQuotes(holdings.map(h => h.symbol));
  }, [holdings, fetchQuotes]);

  const handleAdd = async () => {
    if (!user || !form.symbol || !form.shares || !form.avg_price) {
      toast.error('Fill all required fields'); return;
    }
    const { error } = await supabase.from('holdings').insert({
      user_id: user.id,
      symbol: form.symbol.toUpperCase(),
      name: form.name || form.symbol.toUpperCase(),
      asset_type: form.asset_type,
      shares: parseFloat(form.shares),
      avg_price: parseFloat(form.avg_price),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Holding added');
    setOpen(false);
    setForm({ symbol: '', name: '', asset_type: 'stock', shares: '', avg_price: '' });
    fetchHoldings();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('holdings').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Removed');
    fetchHoldings();
  };

  const totals = holdings.reduce((acc, h) => {
    const price = quotes[h.symbol]?.regularMarketPrice ?? h.avg_price;
    const value = price * h.shares;
    const cost = h.avg_price * h.shares;
    acc.value += value;
    acc.cost += cost;
    return acc;
  }, { value: 0, cost: 0 });
  const gain = totals.value - totals.cost;
  const gainPct = totals.cost ? (gain / totals.cost) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent"><Briefcase className="w-6 h-6 text-accent-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-sm text-muted-foreground">Manage your investment holdings.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchQuotes(holdings.map(h => h.symbol))} disabled={refreshing || !holdings.length}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Holding</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Holding</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Symbol *</Label><Input value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="AAPL" /></div>
                <div><Label>Company Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." /></div>
                <div>
                  <Label>Asset Type</Label>
                  <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="etf">ETF</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Shares *</Label><Input type="number" step="any" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} /></div>
                  <div><Label>Avg Price *</Label><Input type="number" step="any" value={form.avg_price} onChange={e => setForm({ ...form, avg_price: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleAdd}>Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Portfolio Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${totals.value.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${totals.cost.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Gain / Loss</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${gain >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {gain >= 0 ? '+' : ''}${gain.toFixed(2)} ({gainPct.toFixed(2)}%)
            </p>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-center py-8">Loading...</p> :
            holdings.length === 0 ? <p className="text-muted-foreground text-center py-8">No holdings yet. Add your first one!</p> :
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead><TableHead>Shares</TableHead><TableHead>Avg Price</TableHead>
                  <TableHead>Current</TableHead><TableHead>Value</TableHead><TableHead>Change</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map(h => {
                  const q = quotes[h.symbol];
                  const price = q?.regularMarketPrice ?? h.avg_price;
                  const value = price * h.shares;
                  const change = q?.regularMarketChangePercent ?? 0;
                  return (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div className="font-semibold">{h.symbol}</div>
                        <div className="text-xs text-muted-foreground">{h.name}</div>
                      </TableCell>
                      <TableCell>{h.shares}</TableCell>
                      <TableCell>${Number(h.avg_price).toFixed(2)}</TableCell>
                      <TableCell>${price.toFixed(2)}</TableCell>
                      <TableCell>${value.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${change >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {change.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioPage;
