import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CareerSlotsRepository } from './career-slots.repository';
import { UsersRepository } from '../../users/users.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';
import { UserRoleEnum } from '../../common/enums/roles.enum';
import { CreateCareerSlotDto } from './dto/create-career-slot.dto';
import { UpdateCareerSlotDto } from './dto/update-career-slot.dto';
import type {
  CareerSlot,
  CareerSlotWithMeta,
  CareerSlotRequestWithName,
} from '../../common/interfaces/career-slot.interface';

@Injectable()
export class CareerSlotsService {
  constructor(
    private readonly careerSlotsRepository: CareerSlotsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listSlots(
    eventId: string,
    callerUid: string,
  ): Promise<CareerSlotWithMeta[]> {
    const allSlots = await this.careerSlotsRepository.listSlots(eventId);

    const caller = await this.usersRepository.findByUid(callerUid);
    const isManager =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;

    // Non-managers only see approved slots or their own slots
    const slots = allSlots.filter((slot) => {
      if (isManager) return true;
      if (slot.createdByUid === callerUid) return true;
      return (
        slot.approvalStatus === 'approved' || slot.approvalStatus === undefined
      );
    });

    const [creators, approvedCounts, myRequests] = await Promise.all([
      Promise.all(
        slots.map((s) => this.usersRepository.findByUid(s.createdByUid)),
      ),
      Promise.all(
        slots.map((s) =>
          this.careerSlotsRepository.countApproved(eventId, s.id),
        ),
      ),
      Promise.all(
        slots.map((s) =>
          this.careerSlotsRepository.findRequestByRequester(
            eventId,
            s.id,
            callerUid,
          ),
        ),
      ),
    ]);

    return slots.map((slot, i) => ({
      ...slot,
      creatorDisplayName: creators[i]?.displayName ?? slot.createdByUid,
      approvedCount: approvedCounts[i],
      myRequestStatus: myRequests[i]?.status ?? null,
      mySubSlotIndex: myRequests[i]?.subSlotIndex ?? null,
    }));
  }

  async createSlot(
    eventId: string,
    dto: CreateCareerSlotDto,
    createdByUid: string,
  ): Promise<void> {
    const caller = await this.usersRepository.findByUid(createdByUid);
    const isManager =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;

    const approvalStatus: CareerSlot['approvalStatus'] = isManager
      ? 'approved'
      : 'pending_approval';

    const slot = await this.careerSlotsRepository.createSlot(eventId, {
      title: dto.title,
      description: dto.description,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      location: dto.location,
      capacity: dto.capacity,
      requirements: dto.requirements,
      createdByUid,
      createdAt: new Date(),
      approvalStatus,
    });

    if (!isManager) {
      const organizerUid =
        await this.careerSlotsRepository.getEventCreatedBy(eventId);
      if (organizerUid) {
        const organizer = await this.usersRepository.findByUid(organizerUid);
        await this.notificationsService.createNotification({
          uid: organizerUid,
          email: organizer?.email,
          displayName: organizer?.displayName,
          type: NotificationTypeEnum.CAREER_SLOT_APPROVAL_REQUEST,
          message: `${caller?.displayName ?? 'An industry member'} has submitted the career slot "${slot.title}" for your approval.`,
        });
      }
    }
  }

  async updateSlot(
    eventId: string,
    slotId: string,
    dto: UpdateCareerSlotDto,
    callerUid: string,
  ): Promise<void> {
    const [slot, caller] = await Promise.all([
      this.careerSlotsRepository.findSlotById(eventId, slotId),
      this.usersRepository.findByUid(callerUid),
    ]);
    if (!slot) throw new NotFoundException('Career slot not found');
    const isAdminOrOrganizer =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;
    if (!isAdminOrOrganizer && slot.createdByUid !== callerUid) {
      throw new ForbiddenException('Only the slot creator can edit this slot');
    }
    const updates: Partial<
      Pick<
        CareerSlot,
        | 'title'
        | 'description'
        | 'startAt'
        | 'endAt'
        | 'location'
        | 'capacity'
        | 'requirements'
      >
    > = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.startAt !== undefined) updates.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updates.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
    if (dto.requirements !== undefined) updates.requirements = dto.requirements;
    await this.careerSlotsRepository.updateSlot(eventId, slotId, updates);
  }

  async deleteSlot(
    eventId: string,
    slotId: string,
    callerUid: string,
  ): Promise<void> {
    const [slot, caller] = await Promise.all([
      this.careerSlotsRepository.findSlotById(eventId, slotId),
      this.usersRepository.findByUid(callerUid),
    ]);
    if (!slot) throw new NotFoundException('Career slot not found');
    const isAdminOrOrganizer =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;
    if (!isAdminOrOrganizer && slot.createdByUid !== callerUid) {
      throw new ForbiddenException(
        'Only the slot creator can delete this slot',
      );
    }
    await this.careerSlotsRepository.deleteSlot(eventId, slotId);
  }

  async approveSlot(eventId: string, slotId: string): Promise<void> {
    const slot = await this.careerSlotsRepository.findSlotById(eventId, slotId);
    if (!slot) throw new NotFoundException('Career slot not found');

    await this.careerSlotsRepository.updateSlot(eventId, slotId, {
      approvalStatus: 'approved',
    });

    const creator = await this.usersRepository.findByUid(slot.createdByUid);
    await this.notificationsService.createNotification({
      uid: slot.createdByUid,
      email: creator?.email,
      displayName: creator?.displayName,
      type: NotificationTypeEnum.CAREER_SLOT_ORGANIZER_APPROVED,
      message: `Your career slot "${slot.title}" has been approved by the organizer.`,
    });
  }

  async rejectSlot(eventId: string, slotId: string): Promise<void> {
    const slot = await this.careerSlotsRepository.findSlotById(eventId, slotId);
    if (!slot) throw new NotFoundException('Career slot not found');

    await this.careerSlotsRepository.updateSlot(eventId, slotId, {
      approvalStatus: 'rejected',
    });

    const creator = await this.usersRepository.findByUid(slot.createdByUid);
    await this.notificationsService.createNotification({
      uid: slot.createdByUid,
      email: creator?.email,
      displayName: creator?.displayName,
      type: NotificationTypeEnum.CAREER_SLOT_ORGANIZER_REJECTED,
      message: `Your career slot "${slot.title}" has been rejected by the organizer.`,
    });
  }

  async requestSlot(
    eventId: string,
    slotId: string,
    requesterUid: string,
    subSlotIndex: number,
  ): Promise<void> {
    const slot = await this.careerSlotsRepository.findSlotById(eventId, slotId);
    if (!slot) throw new NotFoundException('Career slot not found');

    if (subSlotIndex < 0 || subSlotIndex >= slot.capacity) {
      throw new ConflictException('Invalid sub-slot index');
    }

    const existing = await this.careerSlotsRepository.findRequestByRequester(
      eventId,
      slotId,
      requesterUid,
    );
    if (existing)
      throw new ConflictException('You already have a request for this slot');

    await this.careerSlotsRepository.createRequest(eventId, slotId, {
      requesterUid,
      subSlotIndex,
      status: 'pending',
      requestedAt: new Date(),
    });

    const [requester, creator] = await Promise.all([
      this.usersRepository.findByUid(requesterUid),
      this.usersRepository.findByUid(slot.createdByUid),
    ]);

    await this.notificationsService.createNotification({
      uid: slot.createdByUid,
      email: creator?.email,
      displayName: creator?.displayName,
      type: NotificationTypeEnum.CAREER_SLOT_REQUESTED,
      message: `${requester?.displayName ?? 'Someone'} has requested a spot in your career slot "${slot.title}".`,
    });
  }

  async listRequests(
    eventId: string,
    slotId: string,
    callerUid: string,
  ): Promise<CareerSlotRequestWithName[]> {
    const [slot, caller] = await Promise.all([
      this.careerSlotsRepository.findSlotById(eventId, slotId),
      this.usersRepository.findByUid(callerUid),
    ]);
    if (!slot) throw new NotFoundException('Career slot not found');
    const isAdminOrOrganizer =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;
    if (!isAdminOrOrganizer && slot.createdByUid !== callerUid) {
      throw new ForbiddenException('Only the slot creator can view requests');
    }
    const requests = await this.careerSlotsRepository.listRequests(
      eventId,
      slotId,
    );
    const users = await Promise.all(
      requests.map((r) => this.usersRepository.findByUid(r.requesterUid)),
    );
    return requests.map((req, i) => ({
      ...req,
      requesterDisplayName: users[i]?.displayName ?? req.requesterUid,
    }));
  }

  async respondToRequest(
    eventId: string,
    slotId: string,
    requestId: string,
    callerUid: string,
    status: 'approved' | 'declined',
  ): Promise<void> {
    const slot = await this.careerSlotsRepository.findSlotById(eventId, slotId);
    if (!slot) throw new NotFoundException('Career slot not found');

    const [request, caller] = await Promise.all([
      this.careerSlotsRepository.findRequestById(eventId, slotId, requestId),
      this.usersRepository.findByUid(callerUid),
    ]);
    if (!request) throw new NotFoundException('Request not found');

    const isAdminOrOrganizer =
      caller?.role === UserRoleEnum.ADMIN ||
      caller?.role === UserRoleEnum.ORGANIZER;
    if (!isAdminOrOrganizer && slot.createdByUid !== callerUid) {
      throw new ForbiddenException(
        'Only the slot creator can respond to requests',
      );
    }

    if (status === 'approved') {
      const [approvedCount, subSlotTaken] = await Promise.all([
        this.careerSlotsRepository.countApproved(eventId, slotId),
        this.careerSlotsRepository.findApprovedBySubSlotIndex(
          eventId,
          slotId,
          request.subSlotIndex,
        ),
      ]);
      if (approvedCount >= slot.capacity)
        throw new ConflictException('This slot is fully booked');
      if (subSlotTaken)
        throw new ConflictException('This sub-slot is already taken');
    }

    await this.careerSlotsRepository.updateRequest(eventId, slotId, requestId, {
      status,
      respondedAt: new Date(),
    });

    const [requester, eventTitle] = await Promise.all([
      this.usersRepository.findByUid(request.requesterUid),
      this.careerSlotsRepository.getEventTitle(eventId),
    ]);

    if (status === 'approved') {
      const industryMember = await this.usersRepository.findByUid(
        slot.createdByUid,
      );
      await this.careerSlotsRepository.writeCareerBooking({
        id: requestId,
        requesterUid: request.requesterUid,
        eventId,
        eventTitle: eventTitle ?? eventId,
        slotId,
        slotTitle: slot.title,
        location: slot.location,
        slotStartAt: slot.startAt,
        slotEndAt: slot.endAt,
        capacity: slot.capacity,
        subSlotIndex: request.subSlotIndex,
        industryMemberUid: slot.createdByUid,
        industryMemberName: industryMember?.displayName ?? slot.createdByUid,
        approvedAt: new Date(),
      });
    }

    const notificationType =
      status === 'approved'
        ? NotificationTypeEnum.CAREER_SLOT_APPROVED
        : NotificationTypeEnum.CAREER_SLOT_DECLINED;
    const message =
      status === 'approved'
        ? `Your request for "${slot.title}" has been approved.`
        : `Your request for "${slot.title}" was declined.`;

    await this.notificationsService.createNotification({
      uid: request.requesterUid,
      email: requester?.email,
      displayName: requester?.displayName,
      type: notificationType,
      message,
    });
  }

  async listMyBookings(callerUid: string) {
    return this.careerSlotsRepository.findBookingsByRequester(callerUid);
  }
}
