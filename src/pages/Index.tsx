import { useTranslation } from 'react-i18next';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import FinanceStatCard from '@/components/dashboard/FinanceStatCard';
import SpendingChart from '@/components/dashboard/SpendingChart';
import RecentTransactions from '@/components/dashboard/RecentTransactions';

const Index = () => {
  const { t } = useTranslation();

  const stats = [
    { title: t('dashboard.totalBalance'), value: '$24,563.00', change: `+2.5% ${t('dashboard.fromLastMonth')}`, changeType: 'positive' as const, icon: Wallet },
    { title: t('dashboard.monthlyIncome'), value: '$5,350.00', change: `+$350 ${t('dashboard.fromLastMonth')}`, changeType: 'positive' as const, icon: TrendingUp },
    { title: t('dashboard.monthlySpending'), value: '$2,847.19', change: `-12% ${t('dashboard.fromLastMonth')}`, changeType: 'positive' as const, icon: TrendingDown },
    { title: t('dashboard.totalSavings'), value: '$8,420.00', change: `67% ${t('dashboard.ofGoal')}`, changeType: 'neutral' as const, icon: PiggyBank },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.welcome')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <FinanceStatCard key={i} {...stat} index={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart />
        <RecentTransactions />
      </div>
    </div>
  );
};

export default Index;
