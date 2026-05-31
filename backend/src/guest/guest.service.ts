import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { EventFullError, EventsRepository } from '../events/events.repository';
import { AddGuestDto } from './dto/guest.dto';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import { GuestInvitationsRepository } from './guest.repository';
import { UserRoleEnum } from '../common/enums/roles.enum';
import { randomBytes } from 'crypto';

@Injectable()
export class GuestsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly guestInvitationsRepository: GuestInvitationsRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async addGuest(
    eventId: string,
    callerUid: string,
    dto: AddGuestDto,
  ): Promise<{ message: string }> {
    const event = await this.eventsRepository.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    if (event.createdBy !== callerUid) {
      throw new ForbiddenException('You do not own this event');
    }

    // Get or create guest user
    let guest = await this.usersRepository.findByEmail(dto.email);

    if (!guest) {
      // First time — create pending guest and send first confirmation email
      guest = await this.usersRepository.createGuestUser(
        dto.email,
        dto.displayName,
      );
    } else if (guest.role !== UserRoleEnum.GUEST) {
      // Already a registered user — organizer should use import instead
      throw new BadRequestException(
        'This email belongs to a registered user. Use the import feature instead.',
      );
    } else if (guest.guestStatus === 'pending') {
      // Already invited somewhere, not yet confirmed — don't send another invite
      throw new BadRequestException(
        'This guest has a pending confirmation. Please wait for them to confirm before adding them to another event.',
      );
    }

    // Check if already invited to this specific event
    const existingInvitation =
      await this.guestInvitationsRepository.findByGuestAndEvent(
        guest.uid,
        eventId,
      );
    if (existingInvitation) {
      throw new BadRequestException(
        'This guest has already been invited to this event.',
      );
    }

    // Create the invitation
    const token = randomBytes(32).toString('hex');
    const invitation = await this.guestInvitationsRepository.create({
      guestUid: guest.uid,
      eventId,
      invitedBy: callerUid,
      status: 'pending',
      confirmationToken: token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    // Send invite email
    const isFirstInvite = guest.guestStatus === 'pending';
    await this.notificationsService.createNotification({
      uid: guest.uid,
      type: isFirstInvite
        ? NotificationTypeEnum.GUEST_CONFIRMATION
        : NotificationTypeEnum.GUEST_EVENT_INVITE,
      message: isFirstInvite
        ? `You have been invited to join "${event.title}" on Confera. Please confirm your participation.`
        : `You have been invited to "${event.title}" on Confera.`,
      email: guest.email,
      displayName: guest.displayName,
      eventId,
      confirmationToken: invitation.confirmationToken,
    });

    return { message: 'Guest invitation sent' };
  }

  async confirmInvitation(token: string): Promise<{ message: string }> {
    const invitation = await this.guestInvitationsRepository.findByToken(token);

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation link');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('This invitation link has expired');
    }

    const guest = await this.usersRepository.findByUid(invitation.guestUid);
    if (!guest) throw new NotFoundException('Guest user not found');

    // Confirm guest user if this is their first acceptance
    if (guest.guestStatus === 'pending') {
      await this.usersRepository.confirmGuest(guest.uid);
    }

    // Accept the invitation
    await this.guestInvitationsRepository.accept(invitation.id);

    // Register to the event
    try {
      await this.eventsRepository.registerAtomic(invitation.eventId, guest.uid);
    } catch (err) {
      if (err instanceof EventFullError) {
        throw new BadRequestException(
          'This event is now full. Please contact the organizer.',
        );
      }
      throw err;
    }

    await this.notificationsService.createNotification({
      uid: guest.uid,
      type: NotificationTypeEnum.GUEST_CONFIRMED,
      message: `You have been registered to the event.`,
      email: guest.email,
      eventId: invitation.eventId,
    });

    return { message: 'Confirmed. You have been registered to the event.' };
  }
}
