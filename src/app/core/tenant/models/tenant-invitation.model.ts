
import { TenantRole } from './tenant-member.model';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: Exclude<TenantRole, 'owner'>;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: unknown;
  createdAt: unknown;
}
