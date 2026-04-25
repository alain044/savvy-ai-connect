import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot' | 'mfa';

const AuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');

  // MFA state — surfaced after a successful password sign-in if a TOTP factor is required
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const completeSignIn = () => {
    toast.success('Signed in');
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // After signing in, check whether 2FA is required to reach AAL2
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.find((f) => f.status === 'verified');
        if (totp) {
          setMfaFactorId(totp.id);
          setMode('mfa');
          setLoading(false);
          return;
        }
      }
      setLoading(false);
      completeSignIn();
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success(t('auth.checkEmail'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Check your inbox for a password reset link.');
    setMode('login');
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    const digits = mfaCode.replace(/\D/g, '');
    if (digits.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (cErr || !challenge) { setLoading(false); toast.error(cErr?.message ?? 'Challenge failed'); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: digits });
    setLoading(false);
    if (vErr) { toast.error(vErr.message); return; }
    completeSignIn();
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setMfaFactorId(null);
    setMfaCode('');
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
            {t('auth.title')}
          </CardTitle>
          <CardDescription>
            {mode === 'login' && t('auth.signInToAccount')}
            {mode === 'signup' && t('auth.createNewAccount')}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'mfa' && 'Two-factor verification'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'mfa' ? (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Open your authenticator app and enter the 6-digit code to finish signing in.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification code</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & sign in
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={cancelMfa}>
                Cancel
              </Button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('login')}>
                Back to sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
              </Button>
            </form>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary underline hover:no-underline"
              >
                {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
