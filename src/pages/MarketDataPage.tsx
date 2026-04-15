import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MarketDataPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-accent mb-4">
        <TrendingUp className="w-10 h-10 text-accent-foreground" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">{t('nav.market')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">Real-time market data and stock tracking coming soon.</p>
    </div>
  );
};

export default MarketDataPage;
