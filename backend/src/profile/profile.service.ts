import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { User, UserProfile } from '../common/interfaces/user.interface';
import { MatchingIndexService } from '../matching/matching-index.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly matchingIndexService: MatchingIndexService,
    private readonly firebaseService: FirebaseService,
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

  async deleteMyAccount(uid: string) {
    const existing = await this.usersRepository.findByUid(uid);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.deleteAccountData(uid);
    await this.matchingIndexService.safeRemoveProfile(uid);

    try {
      await this.firebaseService.getAuth().deleteUser(uid);
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code !== 'auth/user-not-found') {
        throw new InternalServerErrorException(
          'Account data deleted, but auth deletion failed',
        );
      }
    }
  }
}
