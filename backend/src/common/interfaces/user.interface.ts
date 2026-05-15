import { UserRoleEnum } from '../enums/roles.enum';
export type ProfileStatus = 'incomplete' | 'complete';
export type MeetingType = 'online' | 'in-person' | 'both';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRoleEnum;
  profileStatus: ProfileStatus;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  bio?: string;
  affiliation?: string;
  interests?: string[];
  goals?: string[];
  meetingType?: MeetingType;
  competencies?: string[];
  researchKeywords?: string[];
  roleProfile?: Record<string, unknown>;
}
