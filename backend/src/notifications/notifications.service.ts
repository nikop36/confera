import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import * as admin from 'firebase-admin';

interface CreateNotificationParams {
  uid: string;
  type: NotificationTypeEnum;
  message: string;
  sendEmail?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async createNotification(params: CreateNotificationParams) {
    const notification = await this.notificationsRepository.create({
      uid: params.uid,
      type: params.type,
      message: params.message,
      read: false,
      archived: false,
      createdAt: new Date(),
    });

    // TODO: Email logic

    return notification;
  }

  async getMyNotifications(user: FirebaseUser, cursor?: string) {
    let firestoreCursor: FirebaseFirestore.Timestamp | undefined;

    if (cursor) {
      // Convert the ISO string from frontend back into a Firestore Timestamp
      const date = new Date(cursor);
      firestoreCursor = admin.firestore.Timestamp.fromDate(date);
    }

    return this.notificationsRepository.findAllByUid(user.uid, firestoreCursor);
  }

  async markAsRead(id: string, user: FirebaseUser) {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    if (notification.uid !== user.uid) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationsRepository.markAsRead(id);
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(user: FirebaseUser) {
    await this.notificationsRepository.markAllAsRead(user.uid);
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(id: string, user: FirebaseUser) {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) throw new NotFoundException('Notification not found');

    if (notification.uid !== user.uid) {
      throw new ForbiddenException('Access denied');
    }

    await this.notificationsRepository.archive(id);
    return { message: 'Notification deleted' };
  }
}
