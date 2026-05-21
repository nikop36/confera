export type ConnectionRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRequest {
  id: string;
  requesterUid: string;
  recipientUid: string;
  status: ConnectionRequestStatus;
  createdAt: Date;
  respondedAt?: Date;
}
