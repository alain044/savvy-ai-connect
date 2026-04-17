import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Search, Star, Trash2, Plus, BellPlus, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface SearchResult { symbol: string; name: string; exchange?: string; type?: string; }
interface Quote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  shortName?: string;
  currency?: string;
}
interface WatchItem { id: string; symbol: string; name: string; asset_type: string; }
interface Alert {
  id: string; symbol: string; name: string; target_price: number; condition: string; active: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MarketDataPage = () => {
  const { user } = useAuth();
  const { format, convert, currency } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [searching, setSearching] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; symbol?: string; name?: string }>({ open: false });
  const [alertForm, setAlertForm] = useState({ target: '', condition: 'above' });

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setWatchlist(data ?? []);
  }, [user]);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('price_alerts').select('*').order('created_at', { ascending: false });
    setAlerts(data ?? []);
  }, [user]);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/market-quotes?action=quotes&symbols=${encodeURIComponent(symbols.join(','))}`, {
      headers: { apikey: ANON },
    });
    const json = await r.json();
    setQuotes(prev => {
      const map = { ...prev };
      (json.quotes ?? []).forEach((q: Quote) => { map[q.symbol] = q; });
      return map;
    });
  }, []);

  useEffect(() => { fetchWatchlist(); fetchAlerts(); }, [fetchWatchlist, fetchAlerts]);
  useEffect(() => { if (watchlist.length) fetchQuotes(watchlist.map(w => w.symbol)); }, [watchlist, fetchQuotes]);

  useEffect(() => {
    if (!watchlist.length) return;
    const id = setInterval(() => fetchQuotes(watchlist.map(w => w.symbol)), 30000);
    return () => clearInterval(id);
  }, [watchlist, fetchQuotes]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/market-quotes?action=search&q=${encodeURIComponent(query)}`, {
        headers: { apikey: ANON },
      });
      const json = await r.json();
      setResults(json.results ?? []);
      if (json.results?.length) fetchQuotes(json.results.map((x: SearchResult) => x.symbol));
    } catch {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addToWatchlist = async (item: SearchResult) => {
    if (!user) return;
    const { error } = await supabase.from('watchlist').insert({
      user_id: user.id, symbol: item.symbol, name: item.name, asset_type: item.type?.toLowerCase() ?? 'stock',
    });
    if (error) {
      if (error.code === '23505') toast.info('Already in watchlist');
      else toast.error(error.message);
      return;
    }
    toast.success(`${item.symbol} added`);
    fetchWatchlist();
  };

  const removeFromWatchlist = async (id: string) => {
    await supabase.from('watchlist').delete().eq('id', id);
    fetchWatchlist();
  };

  const openAlertDialog = (symbol: string, name: string) => {
    const currentPrice = quotes[symbol]?.regularMarketPrice;
    setAlertForm({ target: currentPrice?.toFixed(2) ?? '', condition: 'above' });
    setAlertDialog({ open: true, symbol, name });
  };

  const createAlert = async () => {
    if (!user || !alertDialog.symbol) return;
    const target = parseFloat(alertForm.target);
    if (!target || target <= 0) { toast.error('Enter a valid target price (in USD)'); return; }
    const { error } = await supabase.from('price_alerts').insert({
      user_id: user.id,
      symbol: alertDialog.symbol,
      name: alertDialog.name ?? alertDialog.symbol,
      target_price: target,
      condition: alertForm.condition,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Alert created');
    setAlertDialog({ open: false });
    fetchAlerts();
  };

  const toggleAlert = async (id: string, active: boolean) => {
    await supabase.from('price_alerts').update({ active }).eq('id', id);
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    fetchAlerts();
  };

  const alertsBySymbol = alerts.reduce((acc, a) => {
    (acc[a.symbol] ??= []).push(a);
    return acc;
  }, {} as Record<string, Alert[]>);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent"><TrendingUp className="w-6 h-6 text-accent-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold">Market Data</h1>
            <p className="text-sm text-muted-foreground">Live quotes — prices shown in {currency}, auto-refresh every 30s.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Search Symbols</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Search Apple, BTC-USD, TSLA..." value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={searching}><Search className="w-4 h-4 mr-2" />Search</Button>
          </div>
          {results.length > 0 && (
            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
              {results.map(r => {
                const q = quotes[r.symbol];
                return (
                  <div key={r.symbol} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50">
                    <div>
                      <div className="font-semibold">{r.symbol} <span className="text-xs text-muted-foreground">{r.exchange}</span></div>
                      <div className="text-sm text-muted-foreground">{r.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {q?.regularMarketPrice != null && (
                        <div className="text-right">
                          <div className="font-semibold">{format(q.regularMarketPrice)}</div>
                          <div className={`text-xs ${(q.regularMarketChangePercent ?? 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                            {(q.regularMarketChangePercent ?? 0).toFixed(2)}%
                          </div>
                        </div>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => addToWatchlist(r)} title="Add to watchlist">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Watchlist</CardTitle></CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Search and add symbols to your watchlist.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead><TableHead>Price</TableHead><TableHead>Change</TableHead>
                  <TableHead>Day Range</TableHead><TableHead>Alerts</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map(w => {
                  const q = quotes[w.symbol];
                  const change = q?.regularMarketChangePercent ?? 0;
                  const symAlerts = alertsBySymbol[w.symbol] ?? [];
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-semibold">{w.symbol}</div>
                        <div className="text-xs text-muted-foreground">{w.name}</div>
                      </TableCell>
                      <TableCell>{q?.regularMarketPrice != null ? format(q.regularMarketPrice) : '—'}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${change >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {change.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {q?.regularMarketDayLow != null && q.regularMarketDayHigh != null
                          ? `${format(q.regularMarketDayLow)} - ${format(q.regularMarketDayHigh)}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {symAlerts.length > 0 ? (
                          <Badge variant="secondary" className="gap-1"><Bell className="w-3 h-3" />{symAlerts.length}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Add price alert" onClick={() => openAlertDialog(w.symbol, w.name)}>
                            <BellPlus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeFromWatchlist(w.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Active Price Alerts</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No alerts yet. Click the bell icon on a watchlist row to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead><TableHead>Condition</TableHead><TableHead>Target (USD)</TableHead>
                  <TableHead>Target ({currency})</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-semibold">{a.symbol}</div>
                      <div className="text-xs text-muted-foreground">{a.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.condition === 'above' ? 'default' : 'secondary'}>
                        {a.condition === 'above' ? '↑ above' : '↓ below'}
                      </Badge>
                    </TableCell>
                    <TableCell>${Number(a.target_price).toFixed(2)}</TableCell>
                    <TableCell>{format(Number(a.target_price))}</TableCell>
                    <TableCell><Switch checked={a.active} onCheckedChange={(v) => toggleAlert(a.id, v)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteAlert(a.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={alertDialog.open} onOpenChange={(o) => setAlertDialog({ open: o, symbol: alertDialog.symbol, name: alertDialog.name })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Price Alert for {alertDialog.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Condition</Label>
              <Select value={alertForm.condition} onValueChange={v => setAlertForm({ ...alertForm, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Price rises above</SelectItem>
                  <SelectItem value="below">Price falls below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Price (USD)</Label>
              <Input type="number" step="any" value={alertForm.target} onChange={e => setAlertForm({ ...alertForm, target: e.target.value })} />
              {alertForm.target && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {format(parseFloat(alertForm.target) || 0)} in {currency}
                </p>
              )}
            </div>
          </div>
          <DialogFooter><Button onClick={createAlert}>Create Alert</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketDataPage;
