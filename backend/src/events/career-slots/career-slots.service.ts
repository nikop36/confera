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
    const slots = await this.careerSlotsRepository.listSlots(eventId);

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
    }));
  }

  async createSlot(
    eventId: string,
    dto: CreateCareerSlotDto,
    createdByUid: string,
  ): Promise<void> {
    await this.careerSlotsRepository.createSlot(eventId, {
      title: dto.title,
      description: dto.description,
      scheduledAt: new Date(dto.scheduledAt),
      capacity: dto.capacity,
      createdByUid,
      createdAt: new Date(),
    });
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
      Pick<CareerSlot, 'title' | 'description' | 'scheduledAt' | 'capacity'>
    > = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.scheduledAt !== undefined)
      updates.scheduledAt = new Date(dto.scheduledAt);
    if (dto.capacity !== undefined) updates.capacity = dto.capacity;
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

  async requestSlot(
    eventId: string,
    slotId: string,
    requesterUid: string,
  ): Promise<void> {
    const slot = await this.careerSlotsRepository.findSlotById(eventId, slotId);
    if (!slot) throw new NotFoundException('Career slot not found');

    const existing = await this.careerSlotsRepository.findRequestByRequester(
      eventId,
      slotId,
      requesterUid,
    );
    if (existing) {
      throw new ConflictException('You already have a request for this slot');
    }

    const approvedCount = await this.careerSlotsRepository.countApproved(
      eventId,
      slotId,
    );
    if (approvedCount >= slot.capacity) {
      throw new ConflictException('This slot is fully booked');
    }

    await this.careerSlotsRepository.createRequest(eventId, slotId, {
      requesterUid,
      status: 'pending',
      requestedAt: new Date(),
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
      const approvedCount = await this.careerSlotsRepository.countApproved(
        eventId,
        slotId,
      );
      if (approvedCount >= slot.capacity) {
        throw new ConflictException('This slot is fully booked');
      }
    }

    await this.careerSlotsRepository.updateRequest(eventId, slotId, requestId, {
      status,
      respondedAt: new Date(),
    });

    const requester = await this.usersRepository.findByUid(
      request.requesterUid,
    );
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
}
