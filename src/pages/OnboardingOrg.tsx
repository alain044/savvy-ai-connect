import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Loader2, Building2 } from 'lucide-react';

const OnboardingOrg = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { refresh } = useOrganization();

  const [name, setName] = useState('');
  const [type, setType] = useState('company');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .insert({ name, type, description, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      toast.success(t('org.created'));
      await refresh();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('org.setupTitle')}</CardTitle>
          <CardDescription>{t('org.setupSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('org.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('org.namePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">{t('org.type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">{t('org.types.company')}</SelectItem>
                  <SelectItem value="bank">{t('org.types.bank')}</SelectItem>
                  <SelectItem value="microfinance">{t('org.types.microfinance')}</SelectItem>
                  <SelectItem value="cooperative">{t('org.types.cooperative')}</SelectItem>
                  <SelectItem value="advisory">{t('org.types.advisory')}</SelectItem>
                  <SelectItem value="other">{t('org.types.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('org.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('org.descriptionPlaceholder')}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('org.create')}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={signOut}>
              {t('nav.signOut')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingOrg;
