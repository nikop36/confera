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
import { MatchingIndexService } from '../matching/matching-index.service';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import {
  GraphResponseDto,
  GraphNodeDto,
  GraphEdgeDto,
} from './dto/graph-response.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
    private readonly matchingIndexService: MatchingIndexService,
    private readonly schedulingRepository: SchedulingRepository,
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

  async getGraph(user: {
    uid: string;
    email: string;
  }): Promise<GraphResponseDto> {
    const profile = await this.usersRepository.findByUid(user.uid);
    if (!profile) {
      return { nodes: [], edges: [] };
    }

    const requests = await this.connectionsRepository.listByUser(user.uid);
    const accepted = requests.filter((r) => r.status === 'accepted');

    const peerUids = accepted.map((r) =>
      r.requesterUid === user.uid ? r.recipientUid : r.requesterUid,
    );

    const [peersResult, matchesResult, meetingsResult, peerConnectionsResult] =
      await Promise.allSettled([
        Promise.all(peerUids.map((uid) => this.usersRepository.findByUid(uid))),
        this.matchingIndexService.enabled
          ? this.matchingIndexService.findMatches(profile)
          : Promise.resolve([]),
        this.schedulingRepository.listMeetingsByParticipant(user.uid),
        // For each peer, fetch their accepted connection UIDs to find peer↔peer edges
        Promise.all(
          peerUids.map((uid) =>
            this.connectionsRepository
              .listAcceptedConnectionUids(uid)
              .then((uids) => ({ uid, connectedUids: uids })),
          ),
        ),
      ]);

    const peers =
      peersResult.status === 'fulfilled'
        ? peersResult.value.filter((p): p is NonNullable<typeof p> =>
            Boolean(p),
          )
        : [];

    const selfNode: GraphNodeDto = {
      id: profile.uid,
      type: 'self',
      displayName: profile.displayName,
      role: profile.role,
      affiliation: profile.affiliation,
      isConnected: false,
      tags: profile.tags ?? [],
    };

    const peerNodes: GraphNodeDto[] = peers.map((p) => ({
      id: p.uid,
      type: 'connection',
      displayName: p.displayName,
      role: p.role,
      affiliation: p.affiliation,
      isConnected: true,
      tags: p.tags ?? [],
    }));

    const edges: GraphEdgeDto[] = [];

    // Connection edges — one per accepted peer
    for (const uid of peerUids) {
      edges.push({
        id: `conn-${user.uid}-${uid}`,
        source: user.uid,
        target: uid,
        edgeType: 'connection',
      });
    }

    // Match edges — only for peers that appear in AI results
    if (matchesResult.status === 'fulfilled') {
      const peerSet = new Set(peerUids);
      for (const match of matchesResult.value) {
        if (!peerSet.has(match.uid)) continue;
        edges.push({
          id: `match-${user.uid}-${match.uid}`,
          source: user.uid,
          target: match.uid,
          edgeType: 'match',
          weight: match.score,
          reasons: match.reasons,
        });
      }
    }

    // Interaction edges — count shared meetings per peer
    if (meetingsResult.status === 'fulfilled') {
      const peerSet = new Set(peerUids);
      const countMap = new Map<string, number>();
      for (const meeting of meetingsResult.value) {
        for (const uid of meeting.participantUids) {
          if (uid !== user.uid && peerSet.has(uid)) {
            countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
          }
        }
      }
      for (const [uid, count] of countMap) {
        edges.push({
          id: `interaction-${user.uid}-${uid}`,
          source: user.uid,
          target: uid,
          edgeType: 'interaction',
          count,
        });
      }
    }

    // Peer-to-peer edges + collect FOF UIDs (connected to peers but not to self)
    const fofUids = new Set<string>();
    if (peerConnectionsResult.status === 'fulfilled') {
      const peerSet = new Set(peerUids);
      const seen = new Set<string>();
      for (const { uid: uidA, connectedUids } of peerConnectionsResult.value) {
        for (const uidB of connectedUids) {
          if (uidB === user.uid) continue;
          if (!peerSet.has(uidB)) {
            fofUids.add(uidB); // reachable through a peer, not directly connected
            continue;
          }
          const key = [uidA, uidB].sort((a, b) => a.localeCompare(b)).join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({
            id: `peer-conn-${key}`,
            source: uidA,
            target: uidB,
            edgeType: 'connection',
          });
        }
      }
    }

    // Fetch FOF profiles and build FOF nodes + peer→fof edges
    const fofProfiles = await Promise.allSettled(
      [...fofUids].map((uid) => this.usersRepository.findByUid(uid)),
    );
    const fofNodes: GraphNodeDto[] = fofProfiles
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<
          NonNullable<
            Awaited<ReturnType<typeof this.usersRepository.findByUid>>
          >
        > => r.status === 'fulfilled' && Boolean(r.value),
      )
      .map((r) => ({
        id: r.value.uid,
        type: 'fof' as const,
        displayName: r.value.displayName,
        role: r.value.role,
        affiliation: r.value.affiliation,
        isConnected: false,
        tags: r.value.tags ?? [],
      }));

    const fofNodeIds = new Set(fofNodes.map((n) => n.id));
    if (peerConnectionsResult.status === 'fulfilled') {
      const seen = new Set<string>();
      for (const {
        uid: peerUid,
        connectedUids,
      } of peerConnectionsResult.value) {
        for (const fofUid of connectedUids) {
          if (!fofNodeIds.has(fofUid)) continue;
          const key = [peerUid, fofUid]
            .sort((a, b) => a.localeCompare(b))
            .join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({
            id: `fof-conn-${key}`,
            source: peerUid,
            target: fofUid,
            edgeType: 'connection',
          });
        }
      }
    }

    return { nodes: [selfNode, ...peerNodes, ...fofNodes], edges };
  }
}
