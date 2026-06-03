import { UserRoleEnum } from '../enums/roles.enum';
export type ProfileStatus = 'incomplete' | 'complete';
export type MeetingType = 'online' | 'in-person' | 'both';
export type GuestStatus = 'pending' | 'confirmed';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRoleEnum;
  profileStatus: ProfileStatus;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  guestStatus?: GuestStatus;
}

export interface UserProfile {
  uid: string;
  bio?: string;
  affiliation?: string;
  language?: string;
  timezone?: string;
  interests?: string[];
  goals?: string[];
  meetingType?: MeetingType;
  competencies?: string[];
  researchKeywords?: string[];
  tags?: string[];
  roleProfile?: Record<string, unknown>;
}
