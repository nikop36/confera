import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import type {
  CareerInterview,
  CareerInterviewInvitationStatus,
  CareerInterviewStatusEntry,
  CareerInterviewStatus,
} from '../common/interfaces/career-interview.interface';

@Injectable()
export class CareerInterviewsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(data: Omit<CareerInterview, 'id'>): Promise<CareerInterview> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('careerInterviews').add(data);
    return { id: ref.id, ...data };
  }

  async findById(id: string): Promise<CareerInterview | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('careerInterviews').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as CareerInterview;
  }

  async update(
    id: string,
    data: Partial<Omit<CareerInterview, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('careerInterviews').doc(id).update(data);
  }

  async updateStatus(
    id: string,
    status: CareerInterviewStatus,
    statusEntry: CareerInterviewStatusEntry,
    updatedByUid: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('careerInterviews')
      .doc(id)
      .update({
        status,
        updatedByUid,
        statusHistory: admin.firestore.FieldValue.arrayUnion(statusEntry),
        lastStatusChangedAt: statusEntry.changedAt,
        updatedAt: new Date(),
      });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('careerInterviews').doc(id).delete();
  }

  async listByInterviewerUid(
    interviewerUid: string,
  ): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('careerInterviews')
      .where('interviewerUid', '==', interviewerUid)
      .limit(500)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview)
      .sort((a, b) => {
        const aTime = toEpochMillis(a.createdAt);
        const bTime = toEpochMillis(b.createdAt);
        return bTime - aTime;
      });
  }

  async listByCandidateUid(candidateUid: string): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('careerInterviews')
      .where('candidateUid', '==', candidateUid)
      .limit(500)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview)
      .sort((a, b) => {
        const aTime = toEpochMillis(a.createdAt);
        const bTime = toEpochMillis(b.createdAt);
        return bTime - aTime;
      });
  }

  async updateInvitationStatus(
    id: string,
    invitationStatus: CareerInterviewInvitationStatus,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('careerInterviews').doc(id).update({
      invitationStatus,
      invitationRespondedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async list(status?: CareerInterviewStatus): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const query = status
      ? db.collection('careerInterviews').where('status', '==', status)
      : db.collection('careerInterviews').orderBy('createdAt', 'desc');

    const snapshot = await query.limit(500).get();
    const interviews = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview,
    );
    if (status) {
      return interviews.sort(
        (a, b) => toEpochMillis(b.createdAt) - toEpochMillis(a.createdAt),
      );
    }
    return interviews;
  }

  async findScheduledByRoomAndSlot(
    roomId: string,
    slotId: string,
  ): Promise<CareerInterview | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('careerInterviews')
      .where('roomId', '==', roomId)
      .where('slotId', '==', slotId)
      .where('status', '==', 'scheduled')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as CareerInterview;
  }

  async findScheduledForInterviewerAtSlot(
    interviewerUid: string,
    slotId: string,
  ): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('careerInterviews')
      .where('interviewerUid', '==', interviewerUid)
      .where('slotId', '==', slotId)
      .where('status', '==', 'scheduled')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview,
    );
  }

  async findScheduledForCandidateAtSlot(
    candidateUid: string,
    slotId: string,
  ): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('careerInterviews')
      .where('candidateUid', '==', candidateUid)
      .where('slotId', '==', slotId)
      .where('status', '==', 'scheduled')
      .get();

    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview,
    );
  }
}

function toEpochMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: number }).seconds === 'number'
  ) {
    return ((value as { seconds: number }).seconds ?? 0) * 1000;
  }
  return 0;
}
