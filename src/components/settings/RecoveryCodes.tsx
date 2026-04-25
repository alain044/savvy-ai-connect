import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, KeyRound, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const generateCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i++) {
    if (i === 5) out += '-';
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const hashCode = async (code: string): Promise<string> => {
  const data = new TextEncoder().encode(code);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

interface Props {
  /** When 2FA is not yet enabled, the codes section is informational only. */
  twoFactorEnabled: boolean;
}

export const RecoveryCodes = ({ twoFactorEnabled }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { count } = await supabase
      .from('mfa_recovery_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('used_at', null);
    setRemaining(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const generate = async () => {
    if (!user) return;
    setBusy(true);
    // Invalidate previous unused codes
    await supabase.from('mfa_recovery_codes').delete().eq('user_id', user.id).is('used_at', null);

    const codes = Array.from({ length: 10 }, generateCode);
    const rows = await Promise.all(
      codes.map(async (code) => ({ user_id: user.id, code_hash: await hashCode(code) })),
    );
    const { error } = await supabase.from('mfa_recovery_codes').insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setFreshCodes(codes);
    toast.success('New recovery codes generated');
    refresh();
  };

  const downloadCodes = () => {
    if (!freshCodes) return;
    const content = [
      '2FA Recovery Codes',
      '==================',
      'Store these in a safe place. Each code works once.',
      '',
      ...freshCodes,
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Recovery codes</p>
            <p className="text-xs text-muted-foreground">
              Use a recovery code if you lose access to your authenticator app. Each code works once.
            </p>
          </div>
        </div>
        {!loading && (
          <span className="text-xs text-muted-foreground shrink-0">
            {remaining} unused
          </span>
        )}
      </div>

      {!twoFactorEnabled && (
        <p className="text-xs text-muted-foreground">Enable 2FA above to generate recovery codes.</p>
      )}

      {freshCodes && (
        <Alert>
          <AlertTitle>Save these codes now</AlertTitle>
          <AlertDescription>
            <p className="text-xs mb-2">They will not be shown again. Keep them somewhere safe.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted/50 rounded p-3">
              {freshCodes.map((c) => <div key={c}>{c}</div>)}
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={downloadCodes}>
              <Download className="w-4 h-4 mr-2" /> Download as .txt
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={generate} disabled={busy || !twoFactorEnabled}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {remaining > 0 ? 'Regenerate codes' : 'Generate codes'}
        </Button>
      </div>
    </div>
  );
};
