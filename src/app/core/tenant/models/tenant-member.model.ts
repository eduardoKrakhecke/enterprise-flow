
export type TenantRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'employee';

export interface TenantPermissions {
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  active: boolean;
  createdAt: unknown;
  invitationId?: string;
  pendingRegistrationId?: string;
  name?: string;
  email?: string;
  permissions?: TenantPermissions;
}

