import { Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PortfolioPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-accent mb-4">
        <Briefcase className="w-10 h-10 text-accent-foreground" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">{t('nav.portfolio')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">Track your investment portfolio, manage assets, and monitor performance.</p>
    </div>
  );
};

export default PortfolioPage;
