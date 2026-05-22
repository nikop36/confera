export type CareerInterviewStatus =
  | 'draft'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

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
  createdByUid: string;
  updatedByUid: string;
  statusHistory: CareerInterviewStatusEntry[];
  lastStatusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
