import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionsRepository } from './connections.repository';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendRequest(user: FirebaseUser, recipientUid: string) {
    if (recipientUid === user.uid) {
      throw new BadRequestException(
        'Cannot send a connection request to yourself',
      );
    }

    const recipient = await this.usersRepository.findByUid(recipientUid);
    if (!recipient) throw new NotFoundException('Recipient user not found');

    const pending = await this.connectionsRepository.findPendingBetweenUsers(
      user.uid,
      recipientUid,
    );
    if (pending) {
      throw new BadRequestException(
        'A pending connection request already exists',
      );
    }

    const accepted = await this.connectionsRepository.findAcceptedBetweenUsers(
      user.uid,
      recipientUid,
    );
    if (accepted) {
      throw new BadRequestException('Users are already connected');
    }

    const request = await this.connectionsRepository.createRequest({
      requesterUid: user.uid,
      recipientUid,
      status: 'pending',
      createdAt: new Date(),
    });

    await this.notificationsService.createNotification({
      uid: recipientUid,
      type: NotificationTypeEnum.CONNECTION_REQUEST,
      message: `${user.email} sent you a connection request.`,
    });

    return request;
  }

  async approveRequest(user: FirebaseUser, requestId: string) {
    const request = await this.connectionsRepository.findById(requestId);
    if (!request) throw new NotFoundException('Connection request not found');
    if (request.recipientUid !== user.uid) {
      throw new ForbiddenException('You cannot approve this request');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been processed');
    }

    await this.connectionsRepository.updateStatus(requestId, 'accepted');
    await this.notificationsService.createNotification({
      uid: request.requesterUid,
      type: NotificationTypeEnum.CONNECTION_ACCEPTED,
      message: 'Your connection request was accepted.',
    });
    return { message: 'Connection request approved' };
  }

  async rejectRequest(user: FirebaseUser, requestId: string) {
    const request = await this.connectionsRepository.findById(requestId);
    if (!request) throw new NotFoundException('Connection request not found');
    if (request.recipientUid !== user.uid) {
      throw new ForbiddenException('You cannot reject this request');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been processed');
    }

    await this.connectionsRepository.updateStatus(requestId, 'rejected');
    return { message: 'Connection request rejected' };
  }

  async removeConnection(user: FirebaseUser, requestId: string) {
    const request = await this.connectionsRepository.findById(requestId);
    if (!request) throw new NotFoundException('Connection request not found');

    const involved =
      request.requesterUid === user.uid || request.recipientUid === user.uid;
    if (!involved) {
      throw new ForbiddenException('You cannot delete this connection');
    }

    if (request.status !== 'accepted') {
      throw new BadRequestException('Only accepted connections can be removed');
    }

    await this.connectionsRepository.deleteById(requestId);
    return { message: 'Connection removed' };
  }

  async getMyConnections(user: FirebaseUser) {
    const requests = await this.connectionsRepository.listByUser(user.uid);

    const pendingReceived = requests.filter(
      (request) =>
        request.status === 'pending' && request.recipientUid === user.uid,
    );
    const pendingSent = requests.filter(
      (request) =>
        request.status === 'pending' && request.requesterUid === user.uid,
    );
    const accepted = requests.filter(
      (request) => request.status === 'accepted',
    );

    const relatedUids = new Set<string>();
    for (const request of requests) {
      relatedUids.add(request.requesterUid);
      relatedUids.add(request.recipientUid);
    }
    relatedUids.delete(user.uid);

    const users = await Promise.all(
      [...relatedUids].map((uid) => this.usersRepository.findByUid(uid)),
    );
    const userMap = new Map(
      users
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map((entry) => [entry.uid, entry]),
    );

    const toView = (request: (typeof requests)[number]) => {
      const counterpartUid =
        request.requesterUid === user.uid
          ? request.recipientUid
          : request.requesterUid;
      const counterpart = userMap.get(counterpartUid);
      return {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        requesterUid: request.requesterUid,
        recipientUid: request.recipientUid,
        counterpart: counterpart
          ? {
              uid: counterpart.uid,
              displayName: counterpart.displayName,
              email: counterpart.email,
              affiliation: counterpart.affiliation,
            }
          : { uid: counterpartUid, displayName: 'Unknown user', email: '' },
      };
    };

    return {
      pendingCount: pendingReceived.length,
      pendingReceived: pendingReceived.map(toView),
      pendingSent: pendingSent.map(toView),
      accepted: accepted.map(toView),
    };
  }

  async listAcceptedPairs() {
    const accepted = await this.connectionsRepository.listAccepted();
    return accepted.map((entry) => ({
      id: entry.id,
      requesterUid: entry.requesterUid,
      recipientUid: entry.recipientUid,
    }));
  }
}
