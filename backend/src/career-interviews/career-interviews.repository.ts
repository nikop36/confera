import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import type {
  CareerInterview,
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

  async list(status?: CareerInterviewStatus): Promise<CareerInterview[]> {
    const db = this.firebaseService.getFirestore();
    const query = status
      ? db
          .collection('careerInterviews')
          .where('status', '==', status)
          .orderBy('createdAt', 'desc')
      : db.collection('careerInterviews').orderBy('createdAt', 'desc');

    const snapshot = await query.limit(500).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as CareerInterview,
    );
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
