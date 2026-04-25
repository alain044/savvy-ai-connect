import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Bell, Palette, Shield, Save, Loader2, BellRing, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/contexts/CurrencyContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';
import { OrganizationCard } from '@/components/settings/OrganizationCard';
import { ActivityLog } from '@/components/settings/ActivityLog';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { RecoveryCodes } from '@/components/settings/RecoveryCodes';
import { TotpChallenge } from '@/components/settings/TotpChallenge';
import { MembershipRequests } from '@/components/settings/MembershipRequests';
import { requestPushPermission, sendNotification, watchNotificationPermission, NotificationCategory } from '@/lib/notify';

const diffObject = <T extends Record<string, any>>(prev: T, next: T): Partial<T> => {
  const out: Record<string, any> = {};
  for (const k of Object.keys(next)) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) out[k] = next[k];
  }
  return out as Partial<T>;
};

const SettingsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setCurrency: setGlobalCurrency } = useCurrency();
  const { refresh: refreshPrefs } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );
  const [testingCategory, setTestingCategory] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingPasswordChange, setPendingPasswordChange] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    bio: '',
    currency: 'USD',
  });
  const [initialProfile, setInitialProfile] = useState(profile);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    budgetWarnings: true,
    weeklyReport: false,
    marketAlerts: true,
    goalReminders: true,
  });
  const [initialNotifications, setInitialNotifications] = useState(notifications);

  const [preferences, setPreferences] = useState({
    dateFormat: 'MM/DD/YYYY',
    startOfWeek: 'monday',
    compactView: false,
    showBalances: true,
  });
  const [initialPreferences, setInitialPreferences] = useState(preferences);

  const logAudit = async (section: string, changes: Record<string, unknown>) => {
    if (!user || Object.keys(changes).length === 0) return;
    await supabase.from('settings_audit_log').insert({
      user_id: user.id,
      section,
      changes: changes as any,
    });
    setAuditRefresh((n) => n + 1);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        const next = {
          fullName: profileRes.data.full_name || '',
          email: profileRes.data.email || user.email || '',
          phone: profileRes.data.phone || '',
          bio: profileRes.data.bio || '',
          currency: profileRes.data.currency || 'USD',
        };
        setProfile(next);
        setInitialProfile(next);
      } else {
        const next = { ...profile, email: user.email || '' };
        setProfile(next);
        setInitialProfile(next);
      }

      if (settingsRes.data) {
        const notifs = settingsRes.data.notifications as any;
        const prefs = settingsRes.data.preferences as any;
        if (notifs) {
          const merged = { ...notifications, ...notifs };
          setNotifications(merged);
          setInitialNotifications(merged);
        }
        if (prefs) {
          const merged = { ...preferences, ...prefs };
          setPreferences(merged);
          setInitialPreferences(merged);
        }
      }

      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const changes = diffObject(initialProfile, profile);
    await logAudit('profile', changes);
    setInitialProfile(profile);
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
    const changes = diffObject(initialNotifications, notifications);
    await logAudit('notifications', changes);
    setInitialNotifications(notifications);
    await refreshPrefs();
    // If user enabled push, request browser permission
    if (notifications.pushNotifications && pushPermission === 'default') {
      const result = await requestPushPermission();
      setPushPermission(result);
    }
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
    const changes = diffObject(initialPreferences, preferences);
    await logAudit('preferences', changes);
    setInitialPreferences(preferences);
    await refreshPrefs();
    toast.success(t('settings.preferencesSaved'));
  };

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPushPermission(result);
    if (result === 'granted') toast.success(t('settings.pushEnabled'));
    else if (result === 'denied') toast.error(t('settings.pushDenied'));
  };

  const handleSendTest = async () => {
    if (!user) return;
    setTestingNotif(true);
    await sendNotification({
      userId: user.id,
      title: t('settings.testNotifTitle'),
      message: t('settings.testNotifMessage'),
      type: 'info',
      prefs: notifications,
    });
    // Browser push for "info" requires pushNotifications + permission, even if no category gates it
    if (notifications.pushNotifications && pushPermission === 'granted') {
      try { new Notification(t('settings.testNotifTitle'), { body: t('settings.testNotifMessage') }); } catch { /* noop */ }
    }
    setTestingNotif(false);
    toast.success(t('settings.testNotifSent'));
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
    await logAudit('security', { password: 'updated' });
    toast.success(t('settings.passwordUpdated'));
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <OrganizationCard />

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
              {pushPermission === 'unsupported' && (
                <Alert>
                  <AlertTitle>{t('settings.pushUnsupportedTitle')}</AlertTitle>
                  <AlertDescription>{t('settings.pushUnsupportedDesc')}</AlertDescription>
                </Alert>
              )}
              {pushPermission === 'denied' && (
                <Alert variant="destructive">
                  <AlertTitle>{t('settings.pushBlockedTitle')}</AlertTitle>
                  <AlertDescription>{t('settings.pushBlockedDesc')}</AlertDescription>
                </Alert>
              )}
              {pushPermission === 'default' && notifications.pushNotifications && (
                <Alert>
                  <AlertTitle>{t('settings.pushPermissionTitle')}</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
                    <span>{t('settings.pushPermissionDesc')}</span>
                    <Button size="sm" variant="outline" onClick={handleEnablePush}>
                      <BellRing className="w-4 h-4 mr-2" />{t('settings.enablePush')}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {pushPermission === 'granted' && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <BellRing className="w-4 h-4" />
                  <span>{t('settings.pushReady')}</span>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {t('settings.active')}
                  </Badge>
                </div>
              )}

              {[
                { key: 'emailAlerts' as const, label: t('settings.emailAlerts'), desc: t('settings.emailAlertsDesc') },
                { key: 'pushNotifications' as const, label: t('settings.pushNotifications'), desc: t('settings.pushNotificationsDesc') },
                { key: 'budgetWarnings' as const, label: t('settings.budgetWarnings'), desc: t('settings.budgetWarningsDesc') },
                { key: 'weeklyReport' as const, label: t('settings.weeklyReport'), desc: t('settings.weeklyReportDesc') },
                { key: 'marketAlerts' as const, label: t('settings.marketAlerts'), desc: t('settings.marketAlertsDesc') },
                { key: 'goalReminders' as const, label: t('settings.goalReminders'), desc: t('settings.goalRemindersDesc') },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch checked={notifications[key]} onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })} />
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button onClick={handleSaveNotifications} disabled={saving} className="flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('settings.save')}
                </Button>
                <Button variant="outline" onClick={handleSendTest} disabled={testingNotif} className="flex items-center gap-2">
                  {testingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  {t('settings.sendTest')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.securitySettings')}</CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{t('settings.passwordSection')}</h3>
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
                <Button onClick={handleChangePassword} disabled={saving} className="mt-4 flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('settings.updatePassword')}
                </Button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{t('settings.twoFactor.section')}</h3>
                <TwoFactorAuth />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ActivityLog refreshKey={auditRefresh} />
    </div>
  );
};

export default SettingsPage;
