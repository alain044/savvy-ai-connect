import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Search, Star, Trash2, Plus } from 'lucide-react';
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
}
interface WatchItem { id: string; symbol: string; name: string; asset_type: string; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const MarketDataPage = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [searching, setSearching] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setWatchlist(data ?? []);
  }, [user]);

  const fetchQuotes = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    const r = await fetch(`${SUPABASE_URL}/functions/v1/market-quotes?action=quotes&symbols=${encodeURIComponent(symbols.join(','))}`, {
      headers: { apikey: ANON },
    });
    const json = await r.json();
    const map: Record<string, Quote> = { ...quotes };
    (json.quotes ?? []).forEach((q: Quote) => { map[q.symbol] = q; });
    setQuotes(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);
  useEffect(() => { if (watchlist.length) fetchQuotes(watchlist.map(w => w.symbol)); }, [watchlist, fetchQuotes]);

  // Auto-refresh every 30s
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
    } catch (e) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const addToWatchlist = async (item: SearchResult) => {
    if (!user) return;
    const { error } = await supabase.from('watchlist').insert({
      user_id: user.id,
      symbol: item.symbol,
      name: item.name,
      asset_type: item.type?.toLowerCase() ?? 'stock',
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
    const { error } = await supabase.from('watchlist').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchWatchlist();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent"><TrendingUp className="w-6 h-6 text-accent-foreground" /></div>
        <div>
          <h1 className="text-2xl font-bold">Market Data</h1>
          <p className="text-sm text-muted-foreground">Live quotes — auto-refresh every 30s.</p>
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
                      {q?.regularMarketPrice && (
                        <div className="text-right">
                          <div className="font-semibold">${q.regularMarketPrice.toFixed(2)}</div>
                          <div className={`text-xs ${(q.regularMarketChangePercent ?? 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                            {(q.regularMarketChangePercent ?? 0).toFixed(2)}%
                          </div>
                        </div>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => addToWatchlist(r)}>
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
                  <TableHead>Day Range</TableHead><TableHead>Volume</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map(w => {
                  const q = quotes[w.symbol];
                  const change = q?.regularMarketChangePercent ?? 0;
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-semibold">{w.symbol}</div>
                        <div className="text-xs text-muted-foreground">{w.name}</div>
                      </TableCell>
                      <TableCell>{q?.regularMarketPrice ? `$${q.regularMarketPrice.toFixed(2)}` : '—'}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${change >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {change.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {q?.regularMarketDayLow ? `$${q.regularMarketDayLow.toFixed(2)} - $${q.regularMarketDayHigh?.toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{q?.regularMarketVolume?.toLocaleString() ?? '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeFromWatchlist(w.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketDataPage;
