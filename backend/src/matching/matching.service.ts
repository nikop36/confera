import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { MatchingIndexService } from './matching-index.service';

@Injectable()
export class MatchingService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly matchingIndexService: MatchingIndexService,
  ) {}

  async findMatchesForUser(uid: string) {
    if (!this.matchingIndexService.enabled) {
      throw new ServiceUnavailableException(
        'Matching database is not configured. Set DATABASE_URL to enable AI matching.',
      );
    }

    const profile = await this.usersRepository.findByUid(uid);
    if (!profile) throw new NotFoundException('Profile not found');

    return this.matchingIndexService.findMatches(profile);
  }
}
