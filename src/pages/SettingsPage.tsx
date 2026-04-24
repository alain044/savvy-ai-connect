import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Bell, Palette, Shield, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/contexts/CurrencyContext';

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setCurrency: setGlobalCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    currency: 'USD',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    budgetWarnings: true,
    weeklyReport: false,
    marketAlerts: true,
    goalReminders: true,
  });

  const [preferences, setPreferences] = useState({
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'monday',
    compactView: false,
    showBalances: true,
  });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        setProfile({
          fullName: profileRes.data.full_name || '',
          email: profileRes.data.email || user.email || '',
          phone: profileRes.data.phone || '',
          bio: profileRes.data.bio || '',
          currency: profileRes.data.currency || 'USD',
        });
      } else {
        setProfile((p) => ({ ...p, email: user.email || '' }));
      }

      if (settingsRes.data) {
        const notifs = settingsRes.data.notifications as any;
        const prefs = settingsRes.data.preferences as any;
        if (notifs) setNotifications((n) => ({ ...n, ...notifs }));
        if (prefs) setPreferences((p) => ({ ...p, ...prefs }));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      currency: profile.currency,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { console.error(error); toast.error(t('settings.saveFailed')); return; }
    await setGlobalCurrency(profile.currency as CurrencyCode);
    toast.success(t('settings.saved'));
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      notifications: notifications as any,
      preferences: preferences as any,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { console.error(error); toast.error(t('settings.saveFailed')); return; }
    toast.success(t('settings.notificationsSaved'));
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      notifications: notifications as any,
      preferences: preferences as any,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { console.error(error); toast.error(t('settings.saveFailed')); return; }
    toast.success(t('settings.preferencesSaved'));
  };

  const handleChangePassword = async () => {
    const newPw = (document.getElementById('newPassword') as HTMLInputElement)?.value;
    const confirmPw = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;
    if (!newPw || newPw.length < 6) { toast.error(t('settings.passwordTooShort')); return; }
    if (newPw !== confirmPw) { toast.error(t('settings.passwordMismatch')); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.passwordUpdated'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.preferences')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings.security')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.profileInfo')}</CardTitle>
              <CardDescription>{t('settings.profileDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('settings.fullName')}</Label>
                  <Input id="fullName" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
                  <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings.phone')}</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('settings.currency')}</Label>
                  <Select value={profile.currency} onValueChange={(v) => setProfile({ ...profile, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t('settings.bio')}</Label>
                <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appPreferences')}</CardTitle>
              <CardDescription>{t('settings.preferencesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('settings.dateFormat')}</Label>
                  <Select value={preferences.dateFormat} onValueChange={(v) => setPreferences({ ...preferences, dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.startOfWeek')}</Label>
                  <Select value={preferences.startOfWeek} onValueChange={(v) => setPreferences({ ...preferences, startOfWeek: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">{t('settings.monday')}</SelectItem>
                      <SelectItem value="sunday">{t('settings.sunday')}</SelectItem>
                      <SelectItem value="saturday">{t('settings.saturday')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.compactView')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.compactViewDesc')}</p>
                  </div>
                  <Switch checked={preferences.compactView} onCheckedChange={(v) => setPreferences({ ...preferences, compactView: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('settings.showBalances')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.showBalancesDesc')}</p>
                  </div>
                  <Switch checked={preferences.showBalances} onCheckedChange={(v) => setPreferences({ ...preferences, showBalances: v })} />
                </div>
              </div>
              <Button onClick={handleSavePreferences} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notificationSettings')}</CardTitle>
              <CardDescription>{t('settings.notificationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailAlerts' as const, label: t('settings.emailAlerts'), desc: t('settings.emailAlertsDesc') },
                { key: 'pushNotifications' as const, label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc') },
                { key: 'budgetWarnings' as const, label: t('settings.budgetWarnings'), desc: t('settings.budgetWarningsDesc') },
                { key: 'weeklyReport' as const, label: t('settings.weeklyReport'), desc: t('settings.weeklyReportDesc') },
                { key: 'marketAlerts' as const, label: t('settings.marketAlerts'), desc: t('settings.marketAlertsDesc') },
                { key: 'goalReminders' as const, label: t('settings.goalReminders'), desc: t('settings.goalRemindersDesc') },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={notifications[key]} onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })} />
                </div>
              ))}
              <Button onClick={handleSaveNotifications} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.securitySettings')}</CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                  <Input id="newPassword" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                  <Input id="confirmPassword" type="password" placeholder="••••••••" />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('settings.updatePassword')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
