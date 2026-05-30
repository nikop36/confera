import type { TemplateBuilder } from './index';

export const eventInviteTemplate: TemplateBuilder = ({
  message,
  displayName,
  eventId,
}) => ({
  subject: 'You have been invited to an event — Confera',
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Hello${displayName ? `, ${displayName}` : ''},</h2>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">${message}</p>
      <p style="color: #444; font-size: 16px; line-height: 1.6;">
        You are not yet registered. Click below to view the event and join if you are interested.
      </p>
      <a href="https://confera.com/events/${eventId}"
         style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                background-color: #4f46e5; color: white; text-decoration: none;
                border-radius: 6px; font-size: 15px;">
        View Event
      </a>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">This message was sent automatically. Please do not reply.</p>
    </div>
  `,
});
