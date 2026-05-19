import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { User, UserProfile } from '../common/interfaces/user.interface';
import { MatchingIndexService } from '../matching/matching-index.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly matchingIndexService: MatchingIndexService,
  ) {}

  async findProfile(uid: string): Promise<(User & UserProfile) | null> {
    return this.usersRepository.findByUid(uid);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    await this.usersRepository.updateProfile(uid, data);

    const updatedProfile = await this.usersRepository.findByUid(uid);
    if (updatedProfile) {
      await this.matchingIndexService.safeUpsertProfile(updatedProfile);
    }
  }
}
