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

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly usersRepository: UsersRepository,
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

  async createEvent(dto: CreateEventDto, createdBy: string): Promise<void> {
    await this.eventsRepository.createEvent({
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
  }

  async deleteEvent(id: string): Promise<void> {
    const event = await this.eventsRepository.findById(id);
    if (!event) throw new NotFoundException('Event not found');
    await this.eventsRepository.deleteEvent(id);
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
}
