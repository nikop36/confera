export enum NotificationTypeEnum {
  ROLE_APPROVED = 'role_approved',
  ROLE_REJECTED = 'role_rejected',
  MEETING_REQUEST = 'meeting_request',
  MEETING_ACCEPTED = 'meeting_accepted',
  MEETING_REJECTED = 'meeting_rejected',
  CONNECTION_REQUEST = 'connection_request',
  CONNECTION_ACCEPTED = 'connection_accepted',
  CONNECTION_REJECTED = 'connection_rejected',
  CAREER_INTERVIEW_ASSIGNED = 'career_interview_assigned',
  CAREER_INTERVIEW_RESCHEDULED = 'career_interview_rescheduled',
  CAREER_INTERVIEW_CANCELLED = 'career_interview_cancelled',
  CAREER_SLOT_REQUESTED = 'career_slot_requested',
  CAREER_SLOT_APPROVED = 'career_slot_approved',
  CAREER_SLOT_DECLINED = 'career_slot_declined',
  EVENT_AUTO_REGISTERED = 'event_auto_registered',
  EVENT_INVITE = 'event_invite',
  EVENT_REGISTERED = 'event_registered', // user notified
  EVENT_CANCELLED = 'event_cancelled', // user notified
  EVENT_PARTICIPANT_JOINED = 'event_participant_joined', // organizer notified
  EVENT_PARTICIPANT_CANCELLED = 'event_participant_cancelled', // organizer notified
  GUEST_CONFIRMATION = 'guest_confirmation', // first time — email + system
  GUEST_CONFIRMED = 'guest_confirmed',
  GUEST_EVENT_INVITE = 'guest_event_invite', // confirmed guest, new event — email + system

  SESSION_PRESENTER_INVITED = 'session_presenter_invited',
  SESSION_PRESENTER_CONFIRMED = 'session_presenter_confirmed',
  SESSION_PRESENTER_DECLINED = 'session_presenter_declined',

  CAREER_SLOT_APPROVAL_REQUEST = 'career_slot_approval_request',
  CAREER_SLOT_ORGANIZER_APPROVED = 'career_slot_organizer_approved',
  CAREER_SLOT_ORGANIZER_REJECTED = 'career_slot_organizer_rejected',
}
