import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { User, UserProfile } from '../common/interfaces/user.interface';

@Injectable()
export class ProfileService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findProfile(uid: string): Promise<(User & UserProfile) | null> {
    return this.usersRepository.findByUid(uid);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    return this.usersRepository.updateProfile(uid, data);
  }
}
