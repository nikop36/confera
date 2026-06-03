export type CareerSlotRequestStatus = 'pending' | 'approved' | 'declined';

export interface CareerSlot {
  id: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  location: string;
  capacity: number;
  requirements?: string[];
  createdByUid: string;
  createdAt: Date;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected';
}

export interface CareerSlotRequest {
  id: string;
  requesterUid: string;
  subSlotIndex: number;
  status: CareerSlotRequestStatus;
  requestedAt: Date;
  respondedAt?: Date;
}

export interface CareerSlotWithMeta extends CareerSlot {
  creatorDisplayName: string;
  approvedCount: number;
  myRequestStatus: CareerSlotRequestStatus | null;
  mySubSlotIndex: number | null;
  approvalStatus?: 'pending_approval' | 'approved' | 'rejected';
}

export interface CareerSlotRequestWithName extends CareerSlotRequest {
  requesterDisplayName: string;
}
