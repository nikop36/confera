import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, UserProfile } from '../common/interfaces/user.interface';

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
}
