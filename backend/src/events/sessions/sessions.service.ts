import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  SessionsRepository,
  SessionNotFoundError,
  SessionFullError,
} from './sessions.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  Session,
  SessionRegistration,
  SessionWithMeta,
} from '../../common/interfaces/event.interface';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async listSessions(
    eventId: string,
    callerUid: string,
  ): Promise<SessionWithMeta[]> {
    return this.sessionsRepository.listSessions(eventId, callerUid);
  }

  async createSession(
    eventId: string,
    dto: CreateSessionDto,
    createdBy: string,
  ): Promise<void> {
    await this.sessionsRepository.createSession(eventId, {
      title: dto.title,
      description: dto.description,
      speakers: dto.speakers ?? [],
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      location: dto.location,
      capacity: dto.capacity ?? null,
      registeredCount: 0,
      createdBy,
      createdAt: new Date(),
    });
  }

  async updateSession(
    eventId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ): Promise<void> {
    const session = await this.sessionsRepository.findById(eventId, sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const updates: Partial<
      Omit<Session, 'id' | 'createdBy' | 'createdAt' | 'registeredCount'>
    > = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.speakers !== undefined) updates.speakers = dto.speakers;
    if (dto.startAt !== undefined) updates.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updates.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity ?? null;

    if (Object.keys(updates).length === 0) return;
    await this.sessionsRepository.updateSession(eventId, sessionId, updates);
  }

  async deleteSession(eventId: string, sessionId: string): Promise<void> {
    const session = await this.sessionsRepository.findById(eventId, sessionId);
    if (!session) throw new NotFoundException('Session not found');
    await this.sessionsRepository.deleteSession(eventId, sessionId);
  }

  async registerForSession(
    eventId: string,
    sessionId: string,
    uid: string,
  ): Promise<void> {
    try {
      await this.sessionsRepository.registerAtomic(eventId, sessionId, uid);
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        throw new NotFoundException('Session not found');
      }
      if (err instanceof SessionFullError) {
        throw new ConflictException('Žal so se vsa mesta zapolnila.');
      }
      throw err;
    }
  }

  async cancelRegistration(
    eventId: string,
    sessionId: string,
    uid: string,
  ): Promise<void> {
    await this.sessionsRepository.cancelRegistration(eventId, sessionId, uid);
  }

  async listRegistrations(
    eventId: string,
    sessionId: string,
  ): Promise<SessionRegistration[]> {
    const session = await this.sessionsRepository.findById(eventId, sessionId);
    if (!session) throw new NotFoundException('Session not found');
    return this.sessionsRepository.listRegistrations(eventId, sessionId);
  }
}
