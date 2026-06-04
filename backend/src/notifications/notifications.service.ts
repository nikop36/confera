import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import type { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import * as admin from 'firebase-admin';
import { EmailService } from '../email/email.service';
import { shouldSendEmail } from '../common/constants/notification-config';

interface CreateNotificationParams {
  uid: string;
  email?: string;
  displayName?: string;
  type: NotificationTypeEnum;
  message: string;
  sendEmail?: boolean;
  eventId?: string;
  confirmationToken?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly emailService: EmailService,
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

    const willSendEmail =
      shouldSendEmail(params.type) || params.sendEmail === true;

    if (willSendEmail) {
      if (params.email) {
        try {
          await this.emailService.sendNotificationEmail({
            to: params.email,
            type: params.type,
            message: params.message,
            displayName: params.displayName,
          });
        } catch (err) {
          this.logger.error(
            `Email failed for uid ${params.uid} type ${params.type}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        this.logger.warn(
          `Email skipped for type ${params.type} — no email address provided`,
        );
      }
    }

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
