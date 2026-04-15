import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AnalyticsPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-accent mb-4">
        <BarChart3 className="w-10 h-10 text-accent-foreground" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">{t('nav.analytics')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">Advanced analytics and reports coming soon.</p>
    </div>
  );
};

export default AnalyticsPage;
