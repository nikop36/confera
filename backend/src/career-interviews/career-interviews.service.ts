import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CareerInterviewsRepository } from './career-interviews.repository';
import { UsersRepository } from '../users/users.repository';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import { CreateCareerInterviewDto } from './dto/create-career-interview.dto';
import { AssignCareerInterviewDto } from './dto/assign-career-interview.dto';
import { UpdateCareerInterviewStatusDto } from './dto/update-career-interview-status.dto';
import { UpdateCareerInterviewDto } from './dto/update-career-interview.dto';
import type { CareerInterviewStatus } from '../common/interfaces/career-interview.interface';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { UserRoleEnum } from '../common/enums/roles.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import { ConnectionsRepository } from '../connections/connections.repository';

@Injectable()
export class CareerInterviewsService {
  constructor(
    private readonly careerInterviewsRepository: CareerInterviewsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly schedulingRepository: SchedulingRepository,
    private readonly notificationsService: NotificationsService,
    private readonly connectionsRepository: ConnectionsRepository,
  ) {}

  async create(user: FirebaseUser, dto: CreateCareerInterviewDto) {
    const candidate = await this.usersRepository.findByUid(dto.candidateUid);
    if (!candidate) throw new NotFoundException('Candidate user not found');

    const now = new Date();
    return this.careerInterviewsRepository.create({
      candidateUid: dto.candidateUid,
      notes: dto.notes?.trim(),
      status: 'draft',
      createdByUid: user.uid,
      updatedByUid: user.uid,
      statusHistory: [
        { status: 'draft', changedAt: now, changedByUid: user.uid },
      ],
      lastStatusChangedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  async list(filters?: {
    status?: CareerInterviewStatus;
    candidateUid?: string;
    interviewerUid?: string;
    from?: string;
    to?: string;
  }) {
    const interviews = await this.careerInterviewsRepository.list(
      filters?.status,
    );

    const fromDate = filters?.from ? new Date(filters.from) : null;
    const toDate = filters?.to ? new Date(filters.to) : null;
    if (
      (fromDate && Number.isNaN(fromDate.getTime())) ||
      (toDate && Number.isNaN(toDate.getTime()))
    ) {
      throw new BadRequestException('Invalid from/to date');
    }

    let filtered = interviews;
    if (filters?.candidateUid) {
      filtered = filtered.filter(
        (item) => item.candidateUid === filters.candidateUid,
      );
    }
    if (filters?.interviewerUid) {
      filtered = filtered.filter(
        (item) => item.interviewerUid === filters.interviewerUid,
      );
    }

    if (fromDate || toDate) {
      const slotMap = new Map(
        (
          await this.schedulingRepository.listTimeSlotsInRange(
            fromDate ?? new Date(0),
            toDate ?? new Date('9999-12-31T23:59:59.999Z'),
          )
        ).map((slot) => [slot.id, slot]),
      );
      filtered = filtered.filter(
        (item) => item.slotId && slotMap.has(item.slotId),
      );
    }

    return filtered;
  }

  async assign(user: FirebaseUser, id: string, dto: AssignCareerInterviewDto) {
    const interview = await this.careerInterviewsRepository.findById(id);
    if (!interview) throw new NotFoundException('Career interview not found');

    const [interviewer, room, slot] = await Promise.all([
      this.usersRepository.findByUid(dto.interviewerUid),
      this.schedulingRepository.findRoomById(dto.roomId),
      this.schedulingRepository.findTimeSlotById(dto.slotId),
    ]);

    if (!interviewer) throw new NotFoundException('Interviewer user not found');
    if (
      interviewer.role !== UserRoleEnum.ORGANIZER &&
      interviewer.role !== UserRoleEnum.INDUSTRY &&
      interviewer.role !== UserRoleEnum.ADMIN
    ) {
      throw new BadRequestException(
        'Selected interviewer does not have interviewer role permissions',
      );
    }
    if (!room || !room.active) throw new NotFoundException('Room not found');
    if (!slot) throw new NotFoundException('Time slot not found');

    const connected = await this.connectionsRepository.findAcceptedBetweenUsers(
      interview.candidateUid,
      dto.interviewerUid,
    );
    if (!connected) {
      throw new BadRequestException(
        'Candidate and interviewer must be connected before scheduling interview',
      );
    }

    const wasScheduled = interview.status === 'scheduled';
    const wasSameAssignment =
      interview.interviewerUid === dto.interviewerUid &&
      interview.roomId === dto.roomId &&
      interview.slotId === dto.slotId;

    await this.ensureAvailability({
      interviewId: interview.id,
      candidateUid: interview.candidateUid,
      interviewerUid: dto.interviewerUid,
      roomId: dto.roomId,
      slotId: dto.slotId,
    });

    await this.careerInterviewsRepository.update(id, {
      interviewerUid: dto.interviewerUid,
      roomId: dto.roomId,
      slotId: dto.slotId,
      invitationStatus: 'pending',
      updatedByUid: user.uid,
      updatedAt: new Date(),
    });
    await this.careerInterviewsRepository.updateStatus(
      id,
      'scheduled',
      {
        status: 'scheduled',
        changedAt: new Date(),
        changedByUid: user.uid,
      },
      user.uid,
    );

    const roomLabel = room.name;
    const slotStart = toDate(slot.startAt);
    const slotEnd = toDate(slot.endAt);
    const slotLabel =
      slotStart && slotEnd
        ? `${slotStart.toISOString()} - ${slotEnd.toISOString()}`
        : dto.slotId;
    const isReschedule = wasScheduled && !wasSameAssignment;

    const notificationType = isReschedule
      ? NotificationTypeEnum.CAREER_INTERVIEW_RESCHEDULED
      : NotificationTypeEnum.CAREER_INTERVIEW_ASSIGNED;
    const message = isReschedule
      ? `Career interview was rescheduled to ${slotLabel} in ${roomLabel}.`
      : `Career interview was scheduled at ${slotLabel} in ${roomLabel}.`;

    await Promise.all([
      this.notificationsService.createNotification({
        uid: interview.candidateUid,
        type: notificationType,
        message,
      }),
      this.notificationsService.createNotification({
        uid: dto.interviewerUid,
        type: notificationType,
        message,
      }),
      this.notificationsService.createNotification({
        uid: dto.interviewerUid,
        type: NotificationTypeEnum.MEETING_REQUEST,
        message: `You have a new career interview invite at ${slotLabel} in ${roomLabel}.`,
      }),
    ]);
    return { message: 'Career interview assigned successfully' };
  }

  async updateStatus(
    user: FirebaseUser,
    id: string,
    dto: UpdateCareerInterviewStatusDto,
  ) {
    const interview = await this.careerInterviewsRepository.findById(id);
    if (!interview) throw new NotFoundException('Career interview not found');

    if (dto.status === 'scheduled') {
      if (!interview.interviewerUid || !interview.slotId || !interview.roomId) {
        throw new BadRequestException(
          'Cannot set scheduled status before assignment',
        );
      }

      await this.ensureAvailability({
        interviewId: interview.id,
        candidateUid: interview.candidateUid,
        interviewerUid: interview.interviewerUid,
        roomId: interview.roomId,
        slotId: interview.slotId,
      });
    }

    await this.careerInterviewsRepository.updateStatus(
      id,
      dto.status,
      {
        status: dto.status,
        changedAt: new Date(),
        changedByUid: user.uid,
      },
      user.uid,
    );

    if (dto.status === 'cancelled' && interview.interviewerUid) {
      const message = 'Career interview was cancelled.';
      await Promise.all([
        this.notificationsService.createNotification({
          uid: interview.candidateUid,
          type: NotificationTypeEnum.CAREER_INTERVIEW_CANCELLED,
          message,
        }),
        this.notificationsService.createNotification({
          uid: interview.interviewerUid,
          type: NotificationTypeEnum.CAREER_INTERVIEW_CANCELLED,
          message,
        }),
      ]);
    }
    return { message: 'Career interview status updated successfully' };
  }

  async update(user: FirebaseUser, id: string, dto: UpdateCareerInterviewDto) {
    const interview = await this.careerInterviewsRepository.findById(id);
    if (!interview) throw new NotFoundException('Career interview not found');

    const payload: {
      candidateUid?: string;
      notes?: string;
      updatedByUid: string;
      updatedAt: Date;
    } = {
      updatedByUid: user.uid,
      updatedAt: new Date(),
    };

    if (dto.candidateUid !== undefined) {
      const candidate = await this.usersRepository.findByUid(dto.candidateUid);
      if (!candidate) throw new NotFoundException('Candidate user not found');
      payload.candidateUid = dto.candidateUid;
    }
    if (dto.notes !== undefined) {
      payload.notes = dto.notes.trim();
    }

    if (
      payload.candidateUid &&
      interview.status === 'scheduled' &&
      interview.slotId &&
      interview.interviewerUid &&
      interview.roomId
    ) {
      await this.ensureAvailability({
        interviewId: interview.id,
        candidateUid: payload.candidateUid,
        interviewerUid: interview.interviewerUid,
        roomId: interview.roomId,
        slotId: interview.slotId,
      });
    }

    await this.careerInterviewsRepository.update(id, payload);
    return { message: 'Career interview updated successfully' };
  }

  async delete(id: string) {
    const interview = await this.careerInterviewsRepository.findById(id);
    if (!interview) throw new NotFoundException('Career interview not found');

    await this.careerInterviewsRepository.delete(id);
    return { message: 'Career interview deleted successfully' };
  }

  private async ensureAvailability(params: {
    interviewId: string;
    candidateUid: string;
    interviewerUid: string;
    roomId: string;
    slotId: string;
  }) {
    const [meetingRoomConflict, interviewRoomConflict] = await Promise.all([
      this.schedulingRepository.findMeetingByRoomAndSlot(
        params.roomId,
        params.slotId,
      ),
      this.careerInterviewsRepository.findScheduledByRoomAndSlot(
        params.roomId,
        params.slotId,
      ),
    ]);

    if (meetingRoomConflict) {
      throw new ConflictException(
        'Room is already booked for the selected time slot',
      );
    }
    if (
      interviewRoomConflict &&
      interviewRoomConflict.id !== params.interviewId
    ) {
      throw new ConflictException(
        'Room is already booked for the selected time slot',
      );
    }

    const [
      interviewerMeetingConflicts,
      candidateMeetingConflicts,
      interviewerInterviewConflicts,
      candidateInterviewConflicts,
    ] = await Promise.all([
      this.schedulingRepository.findMeetingsForParticipantAtSlot(
        params.interviewerUid,
        params.slotId,
      ),
      this.schedulingRepository.findMeetingsForParticipantAtSlot(
        params.candidateUid,
        params.slotId,
      ),
      this.careerInterviewsRepository.findScheduledForInterviewerAtSlot(
        params.interviewerUid,
        params.slotId,
      ),
      this.careerInterviewsRepository.findScheduledForCandidateAtSlot(
        params.candidateUid,
        params.slotId,
      ),
    ]);

    const interviewerBusyInInterviews = interviewerInterviewConflicts.some(
      (item) => item.id !== params.interviewId,
    );
    const candidateBusyInInterviews = candidateInterviewConflicts.some(
      (item) => item.id !== params.interviewId,
    );

    if (interviewerMeetingConflicts.length > 0 || interviewerBusyInInterviews) {
      throw new ConflictException(
        'Interviewer is already booked in this time slot',
      );
    }
    if (candidateMeetingConflicts.length > 0 || candidateBusyInInterviews) {
      throw new ConflictException(
        'Candidate is already booked in this time slot',
      );
    }
  }
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const candidate = value as { _seconds?: number; seconds?: number };
    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return null;
}
