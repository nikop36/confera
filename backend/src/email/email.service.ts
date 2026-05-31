import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { getTemplate } from './templates/index';
import type { NotificationTypeEnum } from '../common/enums/notification-type.enum';

interface SendNotificationEmailParams {
  to: string;
  type: NotificationTypeEnum;
  message: string;
  displayName?: string;
  eventId?: string;
  confirmationToken?: string;
}

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
    this.from =
      this.configService.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
    this.enabled = Boolean(apiKey);
    this.resend = this.enabled ? new Resend(apiKey) : null;

    if (this.enabled) {
      this.logger.log(`Email service ready — from: ${this.from}`);
    } else {
      this.logger.warn(
        'Email service disabled (RESEND_API_KEY missing). Notifications will continue without email delivery.',
      );
    }
  }

  async sendNotificationEmail(
    params: SendNotificationEmailParams,
  ): Promise<void> {
    if (!this.enabled || !this.resend) return;

    const template = getTemplate(params.type);
    const { subject, html } = template({
      message: params.message,
      displayName: params.displayName,
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Email send failed to ${params.to}: ${error.message}`);
      throw new Error(error.message);
    }

    this.logger.log(`Email sent to ${params.to} for type ${params.type}`);
  }
}
