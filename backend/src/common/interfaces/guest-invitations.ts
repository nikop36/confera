export type GuestInvitationStatus = 'pending' | 'accepted' | 'expired';

export interface GuestInvitation {
  id: string;
  guestUid: string;
  eventId: string;
  invitedBy: string; // organizer uid
  status: GuestInvitationStatus;
  confirmationToken: string;
  expiresAt: Date;
  createdAt: Date;
}
