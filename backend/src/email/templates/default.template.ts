import type { TemplateBuilder } from './index';

export const defaultTemplate: TemplateBuilder = ({ message, displayName }) => ({
  subject: 'Notification — Confera',
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Hello${displayName ? `, ${displayName}` : ''},</h2>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">${message}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        This message was sent automatically. Please do not reply to it.
      </p>
    </div>
  `,
});
