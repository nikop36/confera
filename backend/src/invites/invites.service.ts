import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { CareerInterviewsRepository } from '../career-interviews/career-interviews.repository';
import { UsersRepository } from '../users/users.repository';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';
import type { CareerInterviewInvitationStatus } from '../common/interfaces/career-interview.interface';

@Injectable()
export class InvitesService {
  constructor(
    private readonly careerInterviewsRepository: CareerInterviewsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly schedulingRepository: SchedulingRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMyInvites(user: FirebaseUser) {
    const [candidateInterviews, interviewerInterviews] = await Promise.all([
      this.careerInterviewsRepository.listByCandidateUid(user.uid),
      this.careerInterviewsRepository.listByInterviewerUid(user.uid),
    ]);
    const relatedUids = [
      ...new Set(
        [...candidateInterviews, ...interviewerInterviews]
          .flatMap((interview) => [
            interview.candidateUid,
            interview.interviewerUid,
          ])
          .filter((uid): uid is string => Boolean(uid)),
      ),
    ];
    const users = await Promise.all(
      relatedUids.map((uid) => this.usersRepository.findByUid(uid)),
    );
    const userMap = new Map(
      users
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map((entry) => [entry.uid, entry]),
    );

    const slotMap = new Map(
      (
        await Promise.all(
          [...candidateInterviews, ...interviewerInterviews]
            .map((i) => i.slotId)
            .filter((id): id is string => Boolean(id))
            .map((slotId) =>
              this.schedulingRepository.findTimeSlotById(slotId),
            ),
        )
      )
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
        .map((slot) => [slot.id, slot]),
    );
    const roomMap = new Map(
      (
        await Promise.all(
          [...candidateInterviews, ...interviewerInterviews]
            .map((i) => i.roomId)
            .filter((id): id is string => Boolean(id))
            .map((roomId) => this.schedulingRepository.findRoomById(roomId)),
        )
      )
        .filter((room): room is NonNullable<typeof room> => Boolean(room))
        .map((room) => [room.id, room]),
    );

    const toView = (interview: (typeof candidateInterviews)[number]) => ({
      id: interview.id,
      status: interview.status,
      invitationStatus: interview.invitationStatus ?? 'pending',
      notes: interview.notes,
      candidate: userMap.get(interview.candidateUid)
        ? {
            uid: interview.candidateUid,
            displayName: userMap.get(interview.candidateUid)?.displayName,
            email: userMap.get(interview.candidateUid)?.email,
          }
        : {
            uid: interview.candidateUid,
            displayName: 'Unknown user',
            email: '',
          },
      interviewer: interview.interviewerUid
        ? userMap.get(interview.interviewerUid)
          ? {
              uid: interview.interviewerUid,
              displayName: userMap.get(interview.interviewerUid)?.displayName,
              email: userMap.get(interview.interviewerUid)?.email,
            }
          : {
              uid: interview.interviewerUid,
              displayName: 'Unknown user',
              email: '',
            }
        : {
            uid: '',
            displayName: 'Not assigned',
            email: '',
          },
      slot: interview.slotId ? (slotMap.get(interview.slotId) ?? null) : null,
      room: interview.roomId ? (roomMap.get(interview.roomId) ?? null) : null,
      createdAt: interview.createdAt,
    });

    const candidatePending = candidateInterviews.filter(
      (item) => (item.invitationStatus ?? 'pending') === 'pending',
    );
    const candidateProcessed = candidateInterviews.filter(
      (item) => (item.invitationStatus ?? 'pending') !== 'pending',
    );
    const interviewerPending = interviewerInterviews.filter(
      (item) => (item.invitationStatus ?? 'pending') === 'pending',
    );
    const interviewerProcessed = interviewerInterviews.filter(
      (item) => (item.invitationStatus ?? 'pending') !== 'pending',
    );

    return {
      pendingCount: candidatePending.length,
      pending: candidatePending.map(toView),
      processed: candidateProcessed.map(toView),
      interviewerPendingCount: interviewerPending.length,
      interviewerPending: interviewerPending.map(toView),
      interviewerProcessed: interviewerProcessed.map(toView),
    };
  }

  async respondToInvite(
    user: FirebaseUser,
    id: string,
    action: Extract<CareerInterviewInvitationStatus, 'accepted' | 'rejected'>,
  ) {
    const interview = await this.careerInterviewsRepository.findById(id);
    if (!interview) throw new NotFoundException('Invite not found');

    if (interview.candidateUid !== user.uid) {
      throw new ForbiddenException('You cannot respond to this invite');
    }
    if ((interview.invitationStatus ?? 'pending') !== 'pending') {
      throw new BadRequestException('Invite has already been processed');
    }

    await this.careerInterviewsRepository.updateInvitationStatus(id, action);
    if (action === 'rejected') {
      await this.careerInterviewsRepository.updateStatus(
        id,
        'cancelled',
        {
          status: 'cancelled',
          changedAt: new Date(),
          changedByUid: user.uid,
        },
        user.uid,
      );
    }

    await this.notificationsService.createNotification({
      uid: interview.interviewerUid ?? interview.createdByUid,
      type:
        action === 'accepted'
          ? NotificationTypeEnum.MEETING_ACCEPTED
          : NotificationTypeEnum.MEETING_REJECTED,
      message:
        action === 'accepted'
          ? 'Candidate accepted the career interview invite.'
          : 'Candidate rejected the career interview invite.',
    });

    return { message: `Invite ${action}` };
  }
}
