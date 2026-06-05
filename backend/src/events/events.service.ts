import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  EventsRepository,
  EventFullError,
  EventNotFoundError,
} from './events.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  Event,
  EventWithMeta,
  EventRegistration,
} from '../common/interfaces/event.interface';
import { ConnectionsRepository } from '../connections/connections.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersRepository } from '../users/users.repository';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import { EmbeddingService } from '../matching/embedding.service';
import { EventIndexService } from './event-index.service';

type EventRecommendation = EventWithMeta & {
  score: number;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly usersRepository: UsersRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly eventIndexService: EventIndexService,
  ) {}

  async listEvents(callerUid: string): Promise<EventWithMeta[]> {
    const friendUids =
      await this.connectionsRepository.listAcceptedConnectionUids(callerUid);
    return this.eventsRepository.listEvents(callerUid, friendUids);
  }

  async getEventById(id: string, callerUid: string): Promise<EventWithMeta> {
    const friendUids =
      await this.connectionsRepository.listAcceptedConnectionUids(callerUid);
    const event = await this.eventsRepository.findByIdWithMeta(
      id,
      callerUid,
      friendUids,
    );
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async listRecommendedEvents(
    callerUid: string,
  ): Promise<EventRecommendation[]> {
    const [caller, events] = await Promise.all([
      this.usersRepository.findByUid(callerUid),
      this.listEvents(callerUid),
    ]);

    if (!caller) return [];

    const now = Date.now();
    const activeEvents = events.filter(
      (event) => event.endAt.getTime() >= now && !event.isRegistered,
    );
    const queryText = this.buildUserEmbeddingText(caller);
    const userTags = this.collectUserTags(caller);

    if (this.eventIndexService.enabled) {
      for (const event of activeEvents) {
        await this.eventIndexService.safeUpsertEvent(event);
      }

      const rankedRows = await this.eventIndexService.semanticSearchEvents(
        queryText,
        60,
      );
      const scoreByEventId = new Map(
        rankedRows.map((row) => [row.event_id, row.score]),
      );

      const boosted = activeEvents.map((event) => {
        const semanticScore = scoreByEventId.get(event.id) ?? 0;
        const tags = event.tags ?? [];
        const overlapCount = tags.filter((tag) => userTags.has(tag)).length;
        const tagScore = tags.length > 0 ? overlapCount / tags.length : 0;
        const friendBoost = Math.min(
          0.2,
          (event.friendsGoing?.length ?? 0) * 0.08,
        );
        const finalScore = semanticScore * 0.35 + tagScore * 0.55 + friendBoost;

        return {
          ...event,
          score: Number(finalScore.toFixed(6)),
        };
      });

      if (boosted.length > 0) {
        return boosted.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.startAt.getTime() - b.startAt.getTime();
        });
      }

      // If SQL index is reachable but produced no rows, continue with in-memory fallback.
    }

    const userEmbedding = this.embeddingService.createEmbedding(queryText);

    const scored = activeEvents.map((event) => {
      const eventEmbedding = this.embeddingService.createEmbedding(
        this.buildEventEmbeddingText(event),
      );

      const semanticScore = this.cosineSimilarity(
        userEmbedding,
        eventEmbedding,
      );
      const tags = event.tags ?? [];
      const overlapCount = tags.filter((tag) => userTags.has(tag)).length;
      const tagScore = tags.length > 0 ? overlapCount / tags.length : 0;
      const friendBoost = Math.min(
        0.2,
        (event.friendsGoing?.length ?? 0) * 0.08,
      );
      const score = semanticScore * 0.35 + tagScore * 0.55 + friendBoost;

      return {
        ...event,
        score: Number(score.toFixed(6)),
      };
    });

    return scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.startAt.getTime() - b.startAt.getTime();
    });
  }

  async createEvent(dto: CreateEventDto, createdBy: string): Promise<void> {
    const created = await this.eventsRepository.createEvent({
      title: dto.title,
      description: dto.description,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      location: dto.location,
      capacity: dto.capacity,
      registeredCount: 0,
      tags: dto.tags ?? [],
      createdBy,
      createdAt: new Date(),
    });
    await this.eventIndexService.safeUpsertEvent(created);
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<void> {
    const event = await this.eventsRepository.findById(id);
    if (!event) throw new NotFoundException('Event not found');

    const updates: Partial<
      Omit<Event, 'id' | 'createdBy' | 'createdAt' | 'registeredCount'>
    > = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.startAt !== undefined) updates.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updates.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
    if (dto.tags !== undefined) updates.tags = dto.tags;

    if (Object.keys(updates).length === 0) return;
    await this.eventsRepository.updateEvent(id, updates);
    const refreshed = await this.eventsRepository.findById(id);
    if (refreshed) {
      await this.eventIndexService.safeUpsertEvent(refreshed);
    }
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.eventsRepository.findById(id);
    if (!event) throw new NotFoundException('Event not found');
    await this.eventsRepository.deleteEvent(id);
    await this.eventIndexService.safeRemoveEvent(id);
  }

  async registerForEvent(eventId: string, uid: string): Promise<void> {
    try {
      await this.eventsRepository.registerAtomic(eventId, uid);
    } catch (err) {
      if (err instanceof EventNotFoundError) {
        throw new NotFoundException('Event not found');
      }
      if (err instanceof EventFullError) {
        throw new ConflictException('Žal so se vsa mesta zapolnila.');
      }
      throw err;
    }
    const updated = await this.eventsRepository.findById(eventId);
    if (updated) {
      await this.eventIndexService.safeUpsertEvent(updated);
    }

    void this.sendRegistrationNotifications(eventId, uid);
  }

  private async sendRegistrationNotifications(
    eventId: string,
    uid: string,
  ): Promise<void> {
    const [event, user] = await Promise.all([
      this.eventsRepository.findById(eventId),
      this.usersRepository.findByUid(uid),
    ]);

    if (!event || !user) return;

    const organizerUser = await this.usersRepository.findByUid(event.createdBy);

    // Notify participant — email + system
    await this.notificationsService.createNotification({
      uid: user.uid,
      type: NotificationTypeEnum.EVENT_REGISTERED,
      message: `You have successfully registered for "${event.title}".`,
      email: user.email,
      displayName: user.displayName,
      eventId,
    });

    // Notify organizer — system only
    if (organizerUser) {
      await this.notificationsService.createNotification({
        uid: organizerUser.uid,
        type: NotificationTypeEnum.EVENT_PARTICIPANT_JOINED,
        message: `${user.displayName ?? 'A participant'} has registered for "${event.title}".`,
        eventId,
      });
    }
  }

  async cancelRegistration(eventId: string, uid: string): Promise<void> {
    await this.eventsRepository.cancelRegistration(eventId, uid);
    const updated = await this.eventsRepository.findById(eventId);
    if (updated) {
      await this.eventIndexService.safeUpsertEvent(updated);
    }

    // Fire notifications after successful cancellation — non-blocking
    void this.sendCancellationNotifications(eventId, uid);
  }

  private async sendCancellationNotifications(
    eventId: string,
    uid: string,
  ): Promise<void> {
    const [event, user] = await Promise.all([
      this.eventsRepository.findById(eventId),
      this.usersRepository.findByUid(uid),
    ]);

    if (!event || !user) return;

    // Notify participant — system only, no email
    await this.notificationsService.createNotification({
      uid: user.uid,
      type: NotificationTypeEnum.EVENT_CANCELLED,
      message: `You have cancelled your registration for "${event.title}".`,
      eventId,
    });

    // Notify organizer — system only
    const organizerUser = await this.usersRepository.findByUid(event.createdBy);
    if (organizerUser) {
      await this.notificationsService.createNotification({
        uid: organizerUser.uid,
        type: NotificationTypeEnum.EVENT_PARTICIPANT_CANCELLED,
        message: `${user.displayName ?? 'A participant'} has cancelled their registration for "${event.title}".`,
        eventId,
      });
    }
  }

  async listRegistrations(eventId: string): Promise<EventRegistration[]> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    return this.eventsRepository.listRegistrations(eventId);
  }

  private collectUserTags(
    caller: Awaited<ReturnType<UsersRepository['findByUid']>>,
  ): Set<string> {
    const tags = new Set<string>();
    const add = (values?: string[]) => {
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
          tags.add(value);
          tags.add(this.toSlug(value));
          const alias = USER_TAG_ALIASES[this.toSlug(value)];
          if (alias) tags.add(alias);
        });
    };

    add(caller?.tags);
    return tags;
  }

  private buildUserEmbeddingText(
    caller: Awaited<ReturnType<UsersRepository['findByUid']>>,
  ): string {
    const tags = caller?.tags ?? [];

    const fields = [`tags: ${tags.join(', ')}`];

    return fields
      .map((field) => field.trim())
      .filter(Boolean)
      .join(' | ');
  }

  private buildEventEmbeddingText(event: EventWithMeta): string {
    const tags = event.tags ?? [];
    return [
      `description: ${event.description}`,
      `tags: ${tags.join(', ')}`,
      `priority_tags: ${tags.join(', ')}`,
    ]
      .map((field) => field.trim())
      .filter(Boolean)
      .join(' | ');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
    }
    return Math.max(0, dot);
  }

  private toSlug(value: string): string {
    const slug = value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-');

    return trimHyphens(slug);
  }
}

function trimHyphens(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === '-') start += 1;
  while (end > start && value[end - 1] === '-') end -= 1;

  return value.slice(start, end);
}

const USER_TAG_ALIASES: Record<string, string> = {
  'umetna-inteligenca': 'artificial-intelligence',
  'strojno-ucenje': 'machine-learning',
  robotika: 'robotics',
  'podatkovna-znanost': 'data-science',
  'kibernetska-varnost': 'cybersecurity',
  'racunalniski-vid': 'computer-vision',
  nlp: 'natural-language-processing',
  blockchain: 'blockchain',
  'internet-stvari': 'internet-of-things',
  digitalizacija: 'digitalization',
  'razvoj-programske-opreme': 'software-development',
  frontend: 'frontend-development',
  backend: 'backend-development',
  devops: 'devops',
  analitika: 'analytics',
  avtomatizacija: 'automation',
  'javna-uprava': 'public-administration',
  izobrazevanje: 'education',
  zdravstvo: 'healthcare',
  trajnost: 'sustainability',
  vzdrznost: 'resilience',
  okolje: 'environment',
  energetika: 'energy',
  logistika: 'logistics',
  podjetnistvo: 'entrepreneurship',
  inovacije: 'innovation',
};
