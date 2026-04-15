import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FinanceAIAdvisor = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-accent mb-4">
        <Bot className="w-10 h-10 text-accent-foreground" />
      </div>
      <h1 className="text-3xl font-bold text-foreground">{t('nav.financeAI')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">AI-powered financial advisor coming soon. Get personalized insights and recommendations.</p>
    </div>
  );
};

export default FinanceAIAdvisor;
