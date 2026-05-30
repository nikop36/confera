import { NotificationTypeEnum } from '../enums/notification-type.enum';

interface NotificationConfig {
  sendEmail: boolean;
}

export const NOTIFICATION_CONFIG: Record<
  NotificationTypeEnum,
  NotificationConfig
> = {
  // Role notifications — email + system
  [NotificationTypeEnum.ROLE_APPROVED]: { sendEmail: true },
  [NotificationTypeEnum.ROLE_REJECTED]: { sendEmail: true },

  // Meeting notifications — email + system
  [NotificationTypeEnum.MEETING_REQUEST]: { sendEmail: true },
  [NotificationTypeEnum.MEETING_ACCEPTED]: { sendEmail: true },
  [NotificationTypeEnum.MEETING_REJECTED]: { sendEmail: true },

  // Career interview — email + system
  [NotificationTypeEnum.CAREER_INTERVIEW_ASSIGNED]: { sendEmail: true },
  [NotificationTypeEnum.CAREER_INTERVIEW_RESCHEDULED]: { sendEmail: true },
  [NotificationTypeEnum.CAREER_INTERVIEW_CANCELLED]: { sendEmail: true },

  // Career slot — email + system
  [NotificationTypeEnum.CAREER_SLOT_APPROVED]: { sendEmail: true },
  [NotificationTypeEnum.CAREER_SLOT_DECLINED]: { sendEmail: true },

  // Connection notifications — system only
  [NotificationTypeEnum.CONNECTION_REQUEST]: { sendEmail: false },
  [NotificationTypeEnum.CONNECTION_ACCEPTED]: { sendEmail: false },
  [NotificationTypeEnum.CONNECTION_REJECTED]: { sendEmail: false },

  [NotificationTypeEnum.EVENT_AUTO_REGISTERED]: { sendEmail: true },
  [NotificationTypeEnum.EVENT_INVITE]: { sendEmail: true },
  [NotificationTypeEnum.EVENT_REGISTERED]: { sendEmail: true },
  [NotificationTypeEnum.EVENT_CANCELLED]: { sendEmail: false }, // system only
  [NotificationTypeEnum.EVENT_PARTICIPANT_JOINED]: { sendEmail: false }, // system only
  [NotificationTypeEnum.EVENT_PARTICIPANT_CANCELLED]: { sendEmail: false }, // system only
};

export function shouldSendEmail(type: NotificationTypeEnum): boolean {
  return NOTIFICATION_CONFIG[type]?.sendEmail ?? false;
}
