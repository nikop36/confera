import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SchedulingRepository,
  SchedulingConflictError,
} from './scheduling.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { GenerateTimeSlotsDto } from './dto/generate-time-slots.dto';
import { AssignMeetingDto } from './dto/assign-meeting.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { UpdateMeetingStatusDto } from './dto/update-meeting-status.dto';
import type { MeetingStatus } from '../common/interfaces/meeting.interface';

@Injectable()
export class SchedulingService {
  constructor(private readonly schedulingRepository: SchedulingRepository) {}

  async createRoom(dto: CreateRoomDto) {
    return this.schedulingRepository.createRoom({
      name: dto.name.trim(),
      location: dto.location?.trim(),
      capacity: dto.capacity,
      active: dto.active ?? true,
      createdAt: new Date(),
    });
  }

  async listRooms() {
    return this.schedulingRepository.listRooms();
  }

  async listAllRooms() {
    return this.schedulingRepository.listAllRooms();
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    const existing = await this.schedulingRepository.findRoomById(id);
    if (!existing) throw new NotFoundException('Room not found');

    const payload: Partial<{
      name: string;
      location: string;
      capacity: number;
      active: boolean;
    }> = {};
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.location !== undefined) payload.location = dto.location.trim();
    if (dto.capacity !== undefined) payload.capacity = dto.capacity;
    if (dto.active !== undefined) payload.active = dto.active;

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.schedulingRepository.updateRoom(id, payload);
    return { message: 'Room updated successfully' };
  }

  async deleteRoom(id: string) {
    const existing = await this.schedulingRepository.findRoomById(id);
    if (!existing) throw new NotFoundException('Room not found');

    const relatedMeetings =
      await this.schedulingRepository.findMeetingsByRoomId(id);
    if (relatedMeetings.length > 0) {
      throw new ConflictException(
        'Cannot delete room with linked meetings. Delete or update meetings first.',
      );
    }

    await this.schedulingRepository.deleteRoom(id);
    return { message: 'Room deleted successfully' };
  }

  async generateTimeSlots(dto: GenerateTimeSlotsDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (endDate < startDate) {
      throw new BadRequestException(
        'endDate must be after or equal to startDate',
      );
    }

    const [startHour, startMinute] = parseTime(dto.dayStartTime);
    const [endHour, endMinute] = parseTime(dto.dayEndTime);
    const dayStartMinutes = startHour * 60 + startMinute;
    const dayEndMinutes = endHour * 60 + endMinute;
    if (dayEndMinutes <= dayStartMinutes) {
      throw new BadRequestException('dayEndTime must be after dayStartTime');
    }
    if (dto.slotDurationMinutes > dayEndMinutes - dayStartMinutes) {
      throw new BadRequestException(
        'slotDurationMinutes is longer than day window',
      );
    }

    const generationEnd = addDays(endDate, 1);
    const existing = await this.schedulingRepository.listTimeSlotsInRange(
      startDate,
      generationEnd,
    );
    const existingKeySet = new Set(
      existing.map(
        (slot) => `${slot.startAt.toISOString()}_${slot.endAt.toISOString()}`,
      ),
    );

    const generated: Array<{ startAt: Date; endAt: Date; createdAt: Date }> =
      [];
    const cursor = atMidnight(startDate);
    const endDay = atMidnight(endDate);

    while (cursor <= endDay) {
      let slotStart = combineDateAndMinuteOffset(cursor, dayStartMinutes);
      const lastPossibleStart = combineDateAndMinuteOffset(
        cursor,
        dayEndMinutes - dto.slotDurationMinutes,
      );

      while (slotStart <= lastPossibleStart) {
        const slotEnd = new Date(
          slotStart.getTime() + dto.slotDurationMinutes * 60_000,
        );
        const key = `${slotStart.toISOString()}_${slotEnd.toISOString()}`;
        if (!existingKeySet.has(key)) {
          generated.push({
            startAt: slotStart,
            endAt: slotEnd,
            createdAt: new Date(),
          });
        }
        slotStart = new Date(
          slotStart.getTime() + dto.slotDurationMinutes * 60_000,
        );
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const created = await this.schedulingRepository.createTimeSlots(generated);
    return {
      generatedCount: created.length,
      existingCount: existing.length,
      slots: created,
    };
  }

  async listTimeSlots(from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date('9999-12-31T23:59:59.999Z');
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }

    return this.schedulingRepository.listTimeSlotsInRange(fromDate, toDate);
  }

  async updateTimeSlot(id: string, dto: UpdateTimeSlotDto) {
    const existing = await this.schedulingRepository.findTimeSlotById(id);
    if (!existing) throw new NotFoundException('Time slot not found');

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid startAt or endAt');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const linkedMeetings =
      await this.schedulingRepository.findMeetingsBySlotId(id);
    if (linkedMeetings.length > 0) {
      throw new ConflictException(
        'Cannot update time slot that already has linked meetings.',
      );
    }

    await this.schedulingRepository.updateTimeSlot(id, { startAt, endAt });
    return { message: 'Time slot updated successfully' };
  }

  async deleteTimeSlot(id: string) {
    const existing = await this.schedulingRepository.findTimeSlotById(id);
    if (!existing) throw new NotFoundException('Time slot not found');

    const linkedMeetings =
      await this.schedulingRepository.findMeetingsBySlotId(id);
    if (linkedMeetings.length > 0) {
      throw new ConflictException(
        'Cannot delete time slot with linked meetings. Delete or update meetings first.',
      );
    }

    await this.schedulingRepository.deleteTimeSlot(id);
    return { message: 'Time slot deleted successfully' };
  }

  async listMeetings(
    status?: MeetingStatus,
    roomId?: string,
    from?: string,
    to?: string,
  ) {
    const meetings = status
      ? await this.schedulingRepository.listMeetingsByStatus(status)
      : await this.schedulingRepository.listMeetings();

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (
      (fromDate && Number.isNaN(fromDate.getTime())) ||
      (toDate && Number.isNaN(toDate.getTime()))
    ) {
      throw new BadRequestException('Invalid from/to date');
    }

    let filtered = meetings;
    if (roomId) {
      filtered = filtered.filter((meeting) => meeting.roomId === roomId);
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
      filtered = filtered.filter((meeting) => slotMap.has(meeting.slotId));
    }

    return filtered;
  }

  async deleteMeeting(id: string) {
    const meeting = await this.schedulingRepository.findMeetingById(id);
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.schedulingRepository.deleteMeeting(id);
    return { message: 'Meeting deleted successfully' };
  }

  async updateMeetingStatus(id: string, dto: UpdateMeetingStatusDto) {
    const meeting = await this.schedulingRepository.findMeetingById(id);
    if (!meeting) throw new NotFoundException('Meeting not found');

    if (dto.status === 'scheduled' && meeting.status !== 'scheduled') {
      const roomConflict =
        await this.schedulingRepository.findMeetingByRoomAndSlot(
          meeting.roomId,
          meeting.slotId,
        );
      if (roomConflict) {
        throw new ConflictException(
          'Room is already booked for the selected time slot',
        );
      }

      const participantConflictChecks = await Promise.all(
        meeting.participantUids.map((uid) =>
          this.schedulingRepository.findMeetingsForParticipantAtSlot(
            uid,
            meeting.slotId,
          ),
        ),
      );
      const hasParticipantConflict = participantConflictChecks.some(
        (conflicts) => conflicts.length > 0,
      );
      if (hasParticipantConflict) {
        throw new ConflictException(
          'One or more participants are already booked in this time slot',
        );
      }
    }

    await this.schedulingRepository.updateMeetingStatus(id, dto.status);
    return { message: 'Meeting status updated successfully' };
  }

  async getTimeSlotAvailability(from?: string, to?: string, roomId?: string) {
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date('9999-12-31T23:59:59.999Z');
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date');
    }

    const [slots, meetings] = await Promise.all([
      this.schedulingRepository.listTimeSlotsInRange(fromDate, toDate),
      this.schedulingRepository.listMeetingsByStatus('scheduled'),
    ]);

    const relevantMeetings = roomId
      ? meetings.filter((meeting) => meeting.roomId === roomId)
      : meetings;

    const slotMeetingCount = new Map<string, number>();
    for (const meeting of relevantMeetings) {
      slotMeetingCount.set(
        meeting.slotId,
        (slotMeetingCount.get(meeting.slotId) ?? 0) + 1,
      );
    }

    return slots.map((slot) => ({
      ...slot,
      scheduledMeetingCount: slotMeetingCount.get(slot.id) ?? 0,
      isBooked: (slotMeetingCount.get(slot.id) ?? 0) > 0,
    }));
  }

  async assignMeeting(dto: AssignMeetingDto) {
    const requestedByUids = deduplicate(dto.requestedByUids);
    const requestedToUids = deduplicate(dto.requestedToUids);
    const overlap = requestedByUids.filter((uid) =>
      requestedToUids.includes(uid),
    );

    if (!requestedByUids.length || !requestedToUids.length) {
      throw new BadRequestException(
        'Both requestedByUids and requestedToUids must contain at least one user',
      );
    }
    if (overlap.length > 0) {
      throw new BadRequestException(
        'requestedByUids and requestedToUids must not contain the same user',
      );
    }

    const [room, slot] = await Promise.all([
      this.schedulingRepository.findRoomById(dto.roomId),
      this.schedulingRepository.findTimeSlotById(dto.slotId),
    ]);

    if (!room?.active) {
      throw new NotFoundException('Room not found');
    }
    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    const allParticipantUids = deduplicate([
      ...requestedByUids,
      ...requestedToUids,
    ]);

    try {
      return await this.schedulingRepository.createMeetingAtomically({
        slotId: dto.slotId,
        roomId: dto.roomId,
        requestedByUids,
        requestedToUids,
        participantUids: allParticipantUids,
        status: 'scheduled',
        createdAt: new Date(),
      });
    } catch (error) {
      if (error instanceof SchedulingConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}

function deduplicate(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseTime(value: string): [number, number] {
  const [h, m] = value.split(':').map(Number);
  return [h, m];
}

function atMidnight(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function combineDateAndMinuteOffset(date: Date, minuteOffset: number): Date {
  const hours = Math.floor(minuteOffset / 60);
  const minutes = minuteOffset % 60;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}
