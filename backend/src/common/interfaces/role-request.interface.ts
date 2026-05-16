import type { RequestableRole } from '../enums/roles.enum';

export type RoleRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleRequest {
  id: string;
  uid: string;
  email: string;
  requestedRole: RequestableRole;
  reason?: string;
  status: RoleRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}
