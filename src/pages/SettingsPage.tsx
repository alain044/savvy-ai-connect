import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Bell, Palette, Shield, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';

const SettingsPage = () => {
  const { t } = useTranslation();

  const [profile, setProfile] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1 234 567 890',
    bio: 'Finance enthusiast and investor.',
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

  const handleSave = (section: string) => {
    toast.success(`${section} saved successfully!`);
  };

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

        {/* Profile Tab */}
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
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings.phone')}</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('settings.currency')}</Label>
                  <Select value={profile.currency} onValueChange={(v) => setProfile({ ...profile, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="RWF">RWF (FRw)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">{t('settings.bio')}</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={() => handleSave('Profile')} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
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
              <Button onClick={() => handleSave('Preferences')} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
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
                  <Switch
                    checked={notifications[key]}
                    onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })}
                  />
                </div>
              ))}
              <Button onClick={() => handleSave('Notifications')} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {t('settings.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.securitySettings')}</CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
                <Input id="currentPassword" type="password" placeholder="••••••••" />
              </div>
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
              <Button onClick={() => handleSave('Password')} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
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
