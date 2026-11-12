
export type TenantStatus = 'active' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  document: string;
  slug: string;
  ownerId: string;
  status: TenantStatus;
  createdAt: unknown;
}

