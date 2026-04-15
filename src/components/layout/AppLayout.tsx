import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Receipt, PiggyBank, Target, Bot,
  Briefcase, TrendingUp, BarChart3, Brain, Bell,
  Settings, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const financeItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/expenses', icon: Receipt, label: t('nav.expenses') },
    { to: '/budgets', icon: PiggyBank, label: t('nav.budgets') },
    { to: '/savings', icon: Target, label: t('nav.savings') },
    { to: '/finance-advisor', icon: Bot, label: t('nav.financeAI') },
  ];

  const portfolioItems = [
    { to: '/portfolio', icon: Briefcase, label: t('nav.portfolio') },
    { to: '/market', icon: TrendingUp, label: t('nav.market') },
    { to: '/portfolio-advisor', icon: Brain, label: t('nav.portfolioAI') },
    { to: '/analytics', icon: BarChart3, label: t('nav.analytics') },
    { to: '/notifications', icon: Bell, label: t('nav.notifications') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const renderNavItem = ({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        key={to}
        to={to}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent">
              Savvy AI
            </h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            {!collapsed && (
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                {t('nav.finance')}
              </p>
            )}
            <div className="space-y-1">{financeItems.map(renderNavItem)}</div>
          </div>
          <div>
            {!collapsed && (
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-3">
                {t('nav.investment')}
              </p>
            )}
            <div className="space-y-1">{portfolioItems.map(renderNavItem)}</div>
          </div>
        </nav>

        {/* Language + Sign out */}
        <div className="p-3 border-t border-border space-y-2">
          <ThemeToggle collapsed={collapsed} />
          <LanguageSelector collapsed={collapsed} />
          <SignOutButton collapsed={collapsed} />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default AppLayout;
