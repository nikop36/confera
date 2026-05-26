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
  EventWithMeta,
  EventRegistration,
} from '../common/interfaces/event.interface';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async listEvents(callerUid: string): Promise<EventWithMeta[]> {
    return this.eventsRepository.listEvents(callerUid);
  }

  async createEvent(dto: CreateEventDto, createdBy: string): Promise<void> {
    await this.eventsRepository.createEvent({
      title: dto.title,
      speakerName: dto.speakerName,
      speakerBio: dto.speakerBio,
      description: dto.description,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      location: dto.location,
      capacity: dto.capacity,
      registeredCount: 0,
      createdBy,
      createdAt: new Date(),
    });
  }

  async updateEvent(id: string, dto: UpdateEventDto): Promise<void> {
    const event = await this.eventsRepository.findById(id);
    if (!event) throw new NotFoundException('Event not found');

    const updates: Partial<{
      title: string;
      speakerName: string;
      speakerBio: string;
      description: string;
      startAt: Date;
      endAt: Date;
      location: string;
      capacity: number;
    }> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.speakerName !== undefined) updates.speakerName = dto.speakerName;
    if (dto.speakerBio !== undefined) updates.speakerBio = dto.speakerBio;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.startAt !== undefined) updates.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updates.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;

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
  }

  async cancelRegistration(eventId: string, uid: string): Promise<void> {
    await this.eventsRepository.cancelRegistration(eventId, uid);
  }

  async listRegistrations(eventId: string): Promise<EventRegistration[]> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    return this.eventsRepository.listRegistrations(eventId);
  }
}
