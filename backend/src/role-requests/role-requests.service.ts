import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { RoleRequestsRepository } from './role-requests.repository';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { UserRoleEnum } from '../common/enums/roles.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';

@Injectable()
export class RoleRequestsService {
  constructor(
    private readonly roleRequestsRepository: RoleRequestsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRoleRequest(user: FirebaseUser, dto: CreateRoleRequestDto) {
    const existingUser = await this.usersRepository.findByUid(user.uid);
    if (!existingUser) throw new NotFoundException('User not found');

    if (existingUser.role !== UserRoleEnum.PARTICIPANT) {
      throw new ForbiddenException(
        'Only participants can request a role upgrade',
      );
    }

    if ((existingUser.role as string) === (dto.requestedRole as string)) {
      throw new BadRequestException('You already have this role');
    }

    const existingRequest = await this.roleRequestsRepository.findPendingByUid(
      user.uid,
    );
    if (existingRequest) {
      throw new BadRequestException('You already have a pending role request');
    }

    return this.roleRequestsRepository.saveRoleRequest({
      uid: user.uid,
      email: user.email,
      requestedRole: dto.requestedRole,
      reason: dto.reason,
      status: 'pending',
      createdAt: new Date(),
    });
  }

  async getPendingRequests() {
    try {
      return await this.roleRequestsRepository.findAllPending();
    } catch (err) {
      console.error('getPendingRequests error:', err);
      throw err;
    }
  }

  async approveRequest(requestId: string, adminUser: FirebaseUser) {
    const request = await this.roleRequestsRepository.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been reviewed');
    }

    await this.roleRequestsRepository.updateStatus(
      requestId,
      'approved',
      adminUser.uid,
    );

    await this.usersRepository.updateUserRole(
      request.uid,
      request.requestedRole,
    );

    await this.notificationsService.createNotification({
      uid: request.uid,
      email: request.email,
      type: NotificationTypeEnum.ROLE_APPROVED,
      message: `Your request for "${request.requestedRole}" has been approved.`,
    });
  }

  async rejectRequest(requestId: string, adminUser: FirebaseUser) {
    const request = await this.roleRequestsRepository.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been reviewed');
    }

    await this.roleRequestsRepository.updateStatus(
      requestId,
      'rejected',
      adminUser.uid,
    );

    await this.notificationsService.createNotification({
      uid: request.uid,
      email: request.email,
      type: NotificationTypeEnum.ROLE_REJECTED,
      message: `Your request for "${request.requestedRole}" has been rejected.`,
    });
  }
}
