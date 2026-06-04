import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventFullError, EventsRepository } from '../events/events.repository';
import { UsersRepository } from '../users/users.repository';
import { buildCsvMany } from './helpers/csv.helper';
import { buildExcelMany } from './helpers/excel.helper';
import { parseCsv } from './helpers/csv.helper';
import { parseExcel } from './helpers/excel.helper';
import { UserRoleEnum } from '../common/enums/roles.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import { ConnectionsRepository } from '../connections/connections.repository';
import { GuestInvitationsRepository } from '../guest/guest.repository';
import { randomBytes } from 'crypto';

type ExportFormat = 'csv' | 'excel';

type UploadedFilePayload = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

type RegistrationRow = {
  displayName: string;
  email: string;
};

type ImportedRegistrationRow = {
  email: string;
};

type ImportCounters = {
  registeredCount: number;
  invitedCount: number;
  skippedCount: number;
};

type EventRecord = NonNullable<
  Awaited<ReturnType<EventsRepository['findById']>>
>;

type UserRecord = NonNullable<
  Awaited<ReturnType<UsersRepository['findByUid']>>
>;

@Injectable()
export class EventsExportService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly guestInvitationsRepository: GuestInvitationsRepository,
  ) {}

  async exportRegistrations(
    eventId: string,
    callerUid: string,
    format: ExportFormat,
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    await this.assertCallerCanManageEvent(eventId, callerUid);

    // Fetch UIDs from events/{eventId}/registrations collection
    const registrations =
      await this.eventsRepository.listRegistrations(eventId);

    const EMPTY_HEADERS = [{ displayName: '', email: '' }];
    const rows: RegistrationRow[] =
      registrations.length === 0
        ? EMPTY_HEADERS
        : (
            await Promise.all(
              registrations.map((r) => this.usersRepository.findByUid(r.uid)),
            )
          )
            .filter((u): u is NonNullable<typeof u> => u !== null)
            .map((u) => ({
              displayName: u.displayName ?? '',
              email: u.email ?? '',
            }));

    const filename = `event-${eventId}-registrations.${format === 'csv' ? 'csv' : 'xlsx'}`;
    const mimetype =
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const buffer =
      format === 'csv' ? buildCsvMany(rows) : await buildExcelMany(rows);

    return { buffer, filename, mimetype };
  }

  async importRegistrations(
    eventId: string,
    callerUid: string,
    file: UploadedFilePayload,
  ): Promise<{
    message: string;
    registeredCount: number;
    invitedCount: number;
    skippedCount: number;
  }> {
    await this.assertCallerCanManageEvent(eventId, callerUid);
    this.validateFile(file);

    const rows = await this.parseFile(file);
    if (rows.length === 0) throw new BadRequestException('The file is empty');

    const [event, organizer] = await Promise.all([
      this.eventsRepository.findById(eventId),
      this.usersRepository.findByUid(callerUid),
    ]);

    if (!event) throw new NotFoundException('Event not found');

    const counters: ImportCounters = {
      registeredCount: 0,
      invitedCount: 0,
      skippedCount: 0,
    };

    for (const raw of rows) {
      const importRow = toImportedRegistrationRow(raw);
      if (!importRow) {
        counters.skippedCount++;
        continue;
      }

      const shouldStop = await this.importRegistrationRow(
        importRow,
        event,
        organizer,
        eventId,
        callerUid,
        rows.length,
        counters,
      );
      if (shouldStop) break;
    }

    return {
      message: 'Import completed',
      registeredCount: counters.registeredCount,
      invitedCount: counters.invitedCount,
      skippedCount: counters.skippedCount,
    };
  }

  private async importRegistrationRow(
    row: ImportedRegistrationRow,
    event: EventRecord,
    organizer: UserRecord | null,
    eventId: string,
    callerUid: string,
    totalRows: number,
    counters: ImportCounters,
  ): Promise<boolean> {
    const user = await this.usersRepository.findByEmail(row.email);
    if (!user || isPendingGuest(user)) {
      counters.skippedCount++;
      return false;
    }

    if (isConfirmedGuest(user)) {
      await this.importConfirmedGuest(
        user,
        event,
        organizer,
        eventId,
        callerUid,
        counters,
      );
      return false;
    }

    const isConnected = await this.connectionsRepository.areConnected(
      callerUid,
      user.uid,
    );
    if (!isConnected) {
      await this.inviteUser(user, event, organizer, eventId, counters);
      return false;
    }

    return this.registerConnectedUser(
      user,
      event,
      organizer,
      eventId,
      totalRows,
      counters,
    );
  }

  private async importConfirmedGuest(
    user: UserRecord,
    event: EventRecord,
    organizer: UserRecord | null,
    eventId: string,
    callerUid: string,
    counters: ImportCounters,
  ) {
    const existingInvitation =
      await this.guestInvitationsRepository.findByGuestAndEvent(
        user.uid,
        eventId,
      );
    if (existingInvitation) {
      counters.skippedCount++;
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.guestInvitationsRepository.create({
      guestUid: user.uid,
      eventId,
      invitedBy: callerUid,
      status: 'pending',
      confirmationToken: token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    await this.notificationsService.createNotification({
      uid: user.uid,
      type: NotificationTypeEnum.GUEST_EVENT_INVITE,
      message: `${organizer?.displayName ?? 'An organizer'} has invited you to "${event.title}".`,
      email: user.email,
      displayName: user.displayName,
      eventId,
      confirmationToken: token,
    });
    counters.invitedCount++;
  }

  private async inviteUser(
    user: UserRecord,
    event: EventRecord,
    organizer: UserRecord | null,
    eventId: string,
    counters: ImportCounters,
  ) {
    counters.invitedCount++;
    await this.notificationsService.createNotification({
      uid: user.uid,
      type: NotificationTypeEnum.EVENT_INVITE,
      message: `${organizer?.displayName ?? 'An organizer'} has invited you to "${event.title}".`,
      email: user.email,
      displayName: user.displayName,
      eventId,
    });
  }

  private async registerConnectedUser(
    user: UserRecord,
    event: EventRecord,
    organizer: UserRecord | null,
    eventId: string,
    totalRows: number,
    counters: ImportCounters,
  ): Promise<boolean> {
    try {
      await this.eventsRepository.registerAtomic(eventId, user.uid);
      counters.registeredCount++;
    } catch (err) {
      if (err instanceof EventFullError) {
        counters.skippedCount +=
          totalRows -
          counters.registeredCount -
          counters.invitedCount -
          counters.skippedCount;
        return true;
      }
      throw err;
    }

    await this.notificationsService.createNotification({
      uid: user.uid,
      type: NotificationTypeEnum.EVENT_AUTO_REGISTERED,
      message: `${organizer?.displayName ?? 'An organizer'} has registered you for "${event.title}". You can cancel if this was a mistake.`,
      email: user.email,
      displayName: user.displayName,
      eventId,
    });
    return false;
  }

  private async assertCallerCanManageEvent(
    eventId: string,
    callerUid: string,
  ): Promise<void> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const caller = await this.usersRepository.findByUid(callerUid);
    if (!caller) throw new NotFoundException('User not found');

    if (caller.role === UserRoleEnum.ADMIN) return;

    if (event.createdBy !== callerUid) {
      throw new ForbiddenException('You do not own this event');
    }
  }

  private validateFile(file: UploadedFilePayload): void {
    const ALLOWED_MIMETYPES = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];
    const extension = '.' + (file.originalname.split('.').pop() ?? '');

    if (
      !ALLOWED_MIMETYPES.includes(file.mimetype) &&
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      throw new BadRequestException(
        'Wrong file type — allowed formats: CSV, Excel',
      );
    }
  }

  private async parseFile(
    file: UploadedFilePayload,
  ): Promise<Record<string, unknown>[]> {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      return parseCsv(file.buffer);
    }
    return parseExcel(file.buffer);
  }
}

function toImportedRegistrationRow(
  raw: Record<string, unknown>,
): ImportedRegistrationRow | null {
  const email = typeof raw['email'] === 'string' ? raw['email'].trim() : null;
  const displayName =
    typeof raw['displayName'] === 'string' ? raw['displayName'].trim() : null;

  if (!email || !displayName) return null;
  return { email };
}

function isPendingGuest(user: UserRecord): boolean {
  return user.role === UserRoleEnum.GUEST && user.guestStatus === 'pending';
}

function isConfirmedGuest(user: UserRecord): boolean {
  return user.role === UserRoleEnum.GUEST && user.guestStatus === 'confirmed';
}
