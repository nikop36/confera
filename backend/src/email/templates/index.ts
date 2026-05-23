import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';
import { careerInterviewAssignedTemplate } from './career-interview-assigned.template';
import { careerInterviewCancelledTemplate } from './career-interview-cancelled.template';
import { defaultTemplate } from './default.template';
import { roleApprovedTemplate } from './role-approved.template';
import { roleRejectedTemplate } from './role-rejected.template';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export type TemplateBuilder = (data: {
  message: string;
  displayName?: string;
}) => EmailTemplate;

export const EMAIL_TEMPLATES: Partial<
  Record<NotificationTypeEnum, TemplateBuilder>
> = {
  [NotificationTypeEnum.ROLE_APPROVED]: roleApprovedTemplate,
  [NotificationTypeEnum.ROLE_REJECTED]: roleRejectedTemplate,
  [NotificationTypeEnum.CAREER_INTERVIEW_ASSIGNED]:
    careerInterviewAssignedTemplate,
  [NotificationTypeEnum.CAREER_INTERVIEW_RESCHEDULED]:
    careerInterviewAssignedTemplate,
  [NotificationTypeEnum.CAREER_INTERVIEW_CANCELLED]:
    careerInterviewCancelledTemplate,
  // MEETING_REQUEST, MEETING_ACCEPTED, MEETING_REJECTED fall back to defaultTemplate
  // TODO: ADD templates for research fairs etc.
};

export function getTemplate(type: NotificationTypeEnum): TemplateBuilder {
  return EMAIL_TEMPLATES[type] ?? defaultTemplate;
}
