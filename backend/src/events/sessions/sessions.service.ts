import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  SessionsRepository,
  SessionNotFoundError,
  SessionFullError,
} from './sessions.repository';
import { UsersRepository } from '../../users/users.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  Session,
  SessionRegistration,
  SessionWithMeta,
} from '../../common/interfaces/event.interface';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    let presenterName: string | undefined;
    let presenterUid: string | undefined;
    let presenterStatus: 'pending' | 'auto_confirmed' | undefined;

    if (dto.presenterUid) {
      presenterUid = dto.presenterUid;
      presenterName = dto.presenterName;
      presenterStatus = 'pending';
    } else if (dto.presenterName) {
      presenterName = dto.presenterName;
      presenterStatus = 'auto_confirmed';
    }

    const session = await this.sessionsRepository.createSession(eventId, {
      title: dto.title,
      description: dto.description,
      speakers: dto.speakers ?? [],
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      location: dto.location,
      capacity: dto.capacity ?? null,
      registeredCount: 0,
      tags: dto.tags ?? [],
      createdBy,
      createdAt: new Date(),
      ...(presenterName !== undefined && { presenterName }),
      ...(presenterUid !== undefined && { presenterUid }),
      ...(presenterStatus !== undefined && { presenterStatus }),
    });

    if (presenterUid && presenterStatus === 'pending') {
      const presenter = await this.usersRepository.findByUid(presenterUid);
      await this.notificationsService.createNotification({
        uid: presenterUid,
        email: presenter?.email,
        displayName: presenter?.displayName,
        type: NotificationTypeEnum.SESSION_PRESENTER_INVITED,
        message: `You have been invited as a presenter for the session "${session.title}".`,
      });
    }
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
    if (dto.tags !== undefined) updates.tags = dto.tags;

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

  async respondToPresenterInvite(
    eventId: string,
    sessionId: string,
    callerUid: string,
    status: 'confirmed' | 'declined',
  ): Promise<void> {
    const session = await this.sessionsRepository.findById(eventId, sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (!session.presenterUid) {
      throw new BadRequestException('This session has no invited presenter');
    }
    if (session.presenterUid !== callerUid) {
      throw new ForbiddenException(
        'Only the invited presenter can respond to this invitation',
      );
    }
    if (session.presenterStatus !== 'pending') {
      throw new ConflictException(
        'This invitation has already been responded to',
      );
    }

    await this.sessionsRepository.updateSession(eventId, sessionId, {
      presenterStatus: status,
      ...(status === 'declined' && { status: 'cancelled' }),
    });

    const [presenter, sessionCreator] = await Promise.all([
      this.usersRepository.findByUid(callerUid),
      this.usersRepository.findByUid(session.createdBy),
    ]);

    const notificationType =
      status === 'confirmed'
        ? NotificationTypeEnum.SESSION_PRESENTER_CONFIRMED
        : NotificationTypeEnum.SESSION_PRESENTER_DECLINED;
    const message =
      status === 'confirmed'
        ? `${presenter?.displayName ?? 'The presenter'} has confirmed their role for the session "${session.title}".`
        : `${presenter?.displayName ?? 'The presenter'} has declined their role for the session "${session.title}".`;

    await this.notificationsService.createNotification({
      uid: session.createdBy,
      email: sessionCreator?.email,
      displayName: sessionCreator?.displayName,
      type: notificationType,
      message,
    });
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
