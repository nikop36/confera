import { NotificationTypeEnum } from '../enums/notification-type.enum';

export interface Notification {
  id: string;
  uid: string;
  type: NotificationTypeEnum;
  message: string;
  read: boolean;
  archived: boolean;
  createdAt: Date;
}

export type CreateNotificationData = Omit<Notification, 'id'>;
