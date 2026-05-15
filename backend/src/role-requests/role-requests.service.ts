import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { RoleRequestsRepository } from './role-requests.repository';

@Injectable()
export class RoleRequestsService {
  constructor(
    private readonly roleRequestsRepository: RoleRequestsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async createRoleRequest() {}

  async getPendingRequests() {}

  async approveRequest() {}

  async rejectRequest() {}
}
