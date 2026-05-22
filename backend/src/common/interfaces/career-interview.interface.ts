export type CareerInterviewStatus =
  | 'draft'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export type CareerInterviewInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected';

export interface CareerInterviewStatusEntry {
  status: CareerInterviewStatus;
  changedAt: Date;
  changedByUid: string;
}

export interface CareerInterview {
  id: string;
  candidateUid: string;
  interviewerUid?: string;
  slotId?: string;
  roomId?: string;
  notes?: string;
  status: CareerInterviewStatus;
  invitationStatus?: CareerInterviewInvitationStatus;
  invitationRespondedAt?: Date;
  createdByUid: string;
  updatedByUid: string;
  statusHistory: CareerInterviewStatusEntry[];
  lastStatusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
