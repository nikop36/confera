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
}

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY') ?? '';
    this.from =
      this.configService.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
    if (!apiKey) {
      this.resend = null;
      this.logger.warn(
        'Email service disabled — RESEND_API_KEY is not configured.',
      );
      return;
    }

    this.resend = new Resend(apiKey);
    this.logger.log(`Email service ready — from: ${this.from}`);
  }

  async sendNotificationEmail(
    params: SendNotificationEmailParams,
  ): Promise<void> {
    if (!this.resend) {
      throw new Error('RESEND_API_KEY is not configured.');
    }

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
