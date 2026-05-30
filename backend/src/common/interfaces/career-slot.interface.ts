export type CareerSlotRequestStatus = 'pending' | 'approved' | 'declined';

export interface CareerSlot {
  id: string;
  title: string;
  description: string;
  scheduledAt: Date;
  capacity: number;
  requirements?: string[];
  createdByUid: string;
  createdAt: Date;
}

export interface CareerSlotRequest {
  id: string;
  requesterUid: string;
  status: CareerSlotRequestStatus;
  requestedAt: Date;
  respondedAt?: Date;
}

export interface CareerSlotWithMeta extends CareerSlot {
  creatorDisplayName: string;
  approvedCount: number;
  myRequestStatus: CareerSlotRequestStatus | null;
}

export interface CareerSlotRequestWithName extends CareerSlotRequest {
  requesterDisplayName: string;
}
