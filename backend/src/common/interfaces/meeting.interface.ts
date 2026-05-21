export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  slotId: string;
  roomId: string;
  requestedByUids: string[];
  requestedToUids: string[];
  participantUids: string[];
  status: MeetingStatus;
  createdAt: Date;
}
