
export type TenantRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'employee';

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  active: boolean;
  createdAt: unknown;
}

