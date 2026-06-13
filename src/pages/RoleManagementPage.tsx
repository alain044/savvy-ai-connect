import { ShieldCheck } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { UserManagementPanel } from '@/components/settings/UserManagementPanel';
import RolePermissionsPanel from '@/components/settings/RolePermissionsPanel';
import AccessDenied from '@/components/AccessDenied';

const RoleManagementPage = () => {
  const { hasAnyRole, loading } = useOrganization();
  const isAdmin = hasAnyRole(['owner', 'ceo']);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <AccessDenied message="Role and permission management is restricted to organization Owners and CEOs." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground">
            Assign roles to members and control which roles can view or manage each module — no database edits required.
          </p>
        </div>
      </div>

      <UserManagementPanel />
      <RolePermissionsPanel />
    </div>
  );
};

export default RoleManagementPage;
