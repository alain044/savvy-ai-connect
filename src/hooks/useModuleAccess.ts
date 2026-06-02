import { useOrganization, AppRole } from '@/contexts/OrganizationContext';

export type AppModule = 'collaboration' | 'voice_briefings';

const ACCESS_MATRIX: Record<AppModule, { view: AppRole[]; manage: AppRole[] }> = {
  collaboration: {
    view: ['owner', 'ceo', 'cfo', 'finance_manager', 'accounting_manager', 'hr_manager', 'auditor', 'team_manager', 'accountant', 'analyst', 'employee'],
    manage: ['owner', 'ceo', 'cfo', 'finance_manager', 'hr_manager', 'team_manager'],
  },
  voice_briefings: {
    view: ['owner', 'ceo', 'cfo', 'finance_manager', 'accounting_manager', 'hr_manager', 'auditor', 'team_manager', 'accountant', 'analyst', 'employee'],
    manage: ['owner', 'ceo', 'cfo', 'finance_manager', 'hr_manager'],
  },
};

export function useModuleAccess(mod: AppModule) {
  const { role } = useOrganization();
  const cfg = ACCESS_MATRIX[mod];
  const canView = !!role && cfg.view.includes(role);
  const canManage = !!role && cfg.manage.includes(role);
  return { canView, canManage, role };
}
