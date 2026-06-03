import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import {
  User,
  UserProfile,
  MeetingType,
} from '../common/interfaces/user.interface';
import { UserRoleEnum } from '../common/enums/roles.enum';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: User): Promise<User> {
    return this.usersRepository.saveUser(data);
  }

  async findByUid(uid: string): Promise<User & UserProfile> {
    const user = await this.usersRepository.findByUid(uid);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByUidOrNull(uid: string): Promise<(User & UserProfile) | null> {
    return this.usersRepository.findByUid(uid);
  }

  async listUsers(search?: string): Promise<Array<User & UserProfile>> {
    const users = await this.usersRepository.listUsers(300);
    const term = search?.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const displayName = user.displayName?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      return displayName.includes(term) || email.includes(term);
    });
  }

  async listUsersForAdmin(search?: string) {
    const [users, reports] = await Promise.all([
      this.listUsers(search),
      this.usersRepository.listProfileReports(),
    ]);
    const reportsByTarget = new Map<
      string,
      Array<{
        id: string;
        reporterUid: string;
        reason: string;
        customReason?: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >();

    for (const report of reports) {
      const existing = reportsByTarget.get(report.targetUid) ?? [];
      existing.push({
        id: report.id,
        reporterUid: report.reporterUid,
        reason: report.reason,
        customReason: report.customReason,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      });
      reportsByTarget.set(report.targetUid, existing);
    }

    return users.map((user) => {
      const userReports = reportsByTarget.get(user.uid) ?? [];
      return {
        ...user,
        reportCount: userReports.length,
        reports: userReports,
      };
    });
  }

  async findByEmailOrNull(email: string): Promise<(User & UserProfile) | null> {
    return this.usersRepository.findByEmail(email);
  }

  async deleteUserAsAdmin(uid: string, currentAdminUid: string): Promise<void> {
    if (uid === currentAdminUid) {
      throw new BadRequestException(
        'Admins cannot delete their own account here',
      );
    }

    const user = await this.usersRepository.findByUid(uid);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.deleteAccountData(uid);
  }

  async markLoginActivity(uid: string): Promise<void> {
    const now = new Date();
    return this.usersRepository.updateUserActivity(uid, {
      lastLoginAt: now,
      lastActiveAt: now,
    });
  }

  async upgradeGuestToParticipant(
    email: string,
    realUid: string,
  ): Promise<void> {
    return this.usersRepository.upgradeGuestToParticipant(email, realUid);
  }

  async listCommunityUsers(): Promise<
    Array<{
      uid: string;
      displayName: string;
      affiliation?: string;
      role: string;
      bio?: string;
      interests?: string[];
      goals?: string[];
      meetingType?: MeetingType;
    }>
  > {
    const users = await this.usersRepository.listUsers(500);
    return users
      .filter((user) => user.role !== UserRoleEnum.ADMIN)
      .map((user) => ({
        uid: user.uid,
        displayName: user.displayName,
        affiliation: user.affiliation,
        role: user.role,
        bio: user.bio,
        interests: user.interests,
        goals: user.goals,
        meetingType: user.meetingType,
      }));
  }
}
