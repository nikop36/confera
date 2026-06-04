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

type GraphUserProfile = NonNullable<
  Awaited<ReturnType<UsersRepository['findByUid']>>
>;

type MatchesResult = PromiseSettledResult<
  Awaited<ReturnType<MatchingIndexService['findMatches']>>
>;

type MeetingsResult = PromiseSettledResult<
  Awaited<ReturnType<SchedulingRepository['listMeetingsByParticipant']>>
>;

type PeerConnection = {
  uid: string;
  connectedUids: string[];
};

type PeerConnectionsResult = PromiseSettledResult<PeerConnection[]>;

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

    const peers = this.getFulfilledProfiles(peersResult);
    const peerConnectionGraph = this.buildPeerConnectionGraph(
      user.uid,
      peerUids,
      peerConnectionsResult,
    );
    const fofNodes = await this.buildFofNodes(peerConnectionGraph.fofUids);

    return {
      nodes: [
        this.toGraphNode(profile, 'self', false),
        ...peers.map((peer) => this.toGraphNode(peer, 'connection', true)),
        ...fofNodes,
      ],
      edges: [
        ...this.buildConnectionEdges(user.uid, peerUids),
        ...this.buildMatchEdges(user.uid, peerUids, matchesResult),
        ...this.buildInteractionEdges(user.uid, peerUids, meetingsResult),
        ...peerConnectionGraph.edges,
        ...this.buildFofEdges(fofNodes, peerConnectionsResult),
      ],
    };
  }

  private getFulfilledProfiles(
    result: PromiseSettledResult<
      Array<Awaited<ReturnType<UsersRepository['findByUid']>>>
    >,
  ): GraphUserProfile[] {
    if (result.status !== 'fulfilled') return [];
    return result.value.filter((profile): profile is GraphUserProfile =>
      Boolean(profile),
    );
  }

  private toGraphNode(
    profile: GraphUserProfile,
    type: GraphNodeDto['type'],
    isConnected: boolean,
  ): GraphNodeDto {
    return {
      id: profile.uid,
      type,
      displayName: profile.displayName,
      role: profile.role,
      affiliation: profile.affiliation,
      isConnected,
      tags: profile.tags ?? [],
    };
  }

  private buildConnectionEdges(
    userUid: string,
    peerUids: string[],
  ): GraphEdgeDto[] {
    return peerUids.map((uid) => ({
      id: `conn-${userUid}-${uid}`,
      source: userUid,
      target: uid,
      edgeType: 'connection',
    }));
  }

  private buildMatchEdges(
    userUid: string,
    peerUids: string[],
    result: MatchesResult,
  ): GraphEdgeDto[] {
    if (result.status !== 'fulfilled') return [];

    const peerSet = new Set(peerUids);
    return result.value
      .filter((match) => peerSet.has(match.uid))
      .map((match) => ({
        id: `match-${userUid}-${match.uid}`,
        source: userUid,
        target: match.uid,
        edgeType: 'match' as const,
        weight: match.score,
        reasons: match.reasons,
      }));
  }

  private buildInteractionEdges(
    userUid: string,
    peerUids: string[],
    result: MeetingsResult,
  ): GraphEdgeDto[] {
    if (result.status !== 'fulfilled') return [];

    const peerSet = new Set(peerUids);
    const countMap = new Map<string, number>();
    for (const meeting of result.value) {
      this.countMeetingInteractions(
        meeting.participantUids,
        userUid,
        peerSet,
        countMap,
      );
    }
    return [...countMap].map(([uid, count]) => ({
      id: `interaction-${userUid}-${uid}`,
      source: userUid,
      target: uid,
      edgeType: 'interaction',
      count,
    }));
  }

  private countMeetingInteractions(
    participantUids: string[],
    userUid: string,
    peerSet: Set<string>,
    countMap: Map<string, number>,
  ) {
    for (const uid of participantUids) {
      if (uid !== userUid && peerSet.has(uid)) {
        countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
      }
    }
  }

  private buildPeerConnectionGraph(
    userUid: string,
    peerUids: string[],
    result: PeerConnectionsResult,
  ): { edges: GraphEdgeDto[]; fofUids: Set<string> } {
    const edges: GraphEdgeDto[] = [];
    const fofUids = new Set<string>();
    if (result.status !== 'fulfilled') return { edges, fofUids };

    const peerSet = new Set(peerUids);
    const seen = new Set<string>();
    for (const peerConnection of result.value) {
      this.appendPeerConnectionEdges(
        peerConnection,
        userUid,
        peerSet,
        seen,
        edges,
        fofUids,
      );
    }
    return { edges, fofUids };
  }

  private appendPeerConnectionEdges(
    peerConnection: PeerConnection,
    userUid: string,
    peerSet: Set<string>,
    seen: Set<string>,
    edges: GraphEdgeDto[],
    fofUids: Set<string>,
  ) {
    for (const connectedUid of peerConnection.connectedUids) {
      if (connectedUid === userUid) continue;
      if (!peerSet.has(connectedUid)) {
        fofUids.add(connectedUid);
        continue;
      }
      this.appendUniqueConnectionEdge(
        peerConnection.uid,
        connectedUid,
        'peer-conn',
        seen,
        edges,
      );
    }
  }

  private async buildFofNodes(fofUids: Set<string>): Promise<GraphNodeDto[]> {
    const fofProfiles = await Promise.allSettled(
      [...fofUids].map((uid) => this.usersRepository.findByUid(uid)),
    );
    return this.getFulfilledProfileResults(fofProfiles).map((profile) =>
      this.toGraphNode(profile, 'fof', false),
    );
  }

  private getFulfilledProfileResults(
    results: Array<
      PromiseSettledResult<Awaited<ReturnType<UsersRepository['findByUid']>>>
    >,
  ): GraphUserProfile[] {
    return results
      .filter(
        (result): result is PromiseFulfilledResult<GraphUserProfile> =>
          result.status === 'fulfilled' && Boolean(result.value),
      )
      .map((result) => result.value);
  }

  private buildFofEdges(
    fofNodes: GraphNodeDto[],
    result: PeerConnectionsResult,
  ): GraphEdgeDto[] {
    if (result.status !== 'fulfilled') return [];

    const fofNodeIds = new Set(fofNodes.map((node) => node.id));
    const seen = new Set<string>();
    const edges: GraphEdgeDto[] = [];
    for (const peerConnection of result.value) {
      this.appendFofEdges(peerConnection, fofNodeIds, seen, edges);
    }
    return edges;
  }

  private appendFofEdges(
    peerConnection: PeerConnection,
    fofNodeIds: Set<string>,
    seen: Set<string>,
    edges: GraphEdgeDto[],
  ) {
    for (const fofUid of peerConnection.connectedUids) {
      if (!fofNodeIds.has(fofUid)) continue;
      this.appendUniqueConnectionEdge(
        peerConnection.uid,
        fofUid,
        'fof-conn',
        seen,
        edges,
      );
    }
  }

  private appendUniqueConnectionEdge(
    source: string,
    target: string,
    prefix: string,
    seen: Set<string>,
    edges: GraphEdgeDto[],
  ) {
    const key = this.pairKey(source, target);
    if (seen.has(key)) return;

    seen.add(key);
    edges.push({
      id: `${prefix}-${key}`,
      source,
      target,
      edgeType: 'connection',
    });
  }

  private pairKey(left: string, right: string): string {
    return [left, right].sort((a, b) => a.localeCompare(b)).join('|');
  }
}
