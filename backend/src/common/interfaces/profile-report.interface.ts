import type { ProfileReportReason } from '../../profile/dto/report-profile.dto';

export interface ProfileReport {
  id: string;
  targetUid: string;
  reporterUid: string;
  reason: ProfileReportReason;
  customReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
