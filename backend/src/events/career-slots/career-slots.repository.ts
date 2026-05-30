import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import type {
  CareerSlot,
  CareerSlotRequest,
  CareerSlotRequestStatus,
} from '../../common/interfaces/career-slot.interface';

@Injectable()
export class CareerSlotsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  private slotsCol(eventId: string) {
    return this.firebaseService
      .getFirestore()
      .collection('events')
      .doc(eventId)
      .collection('careerSlots');
  }

  private requestsCol(eventId: string, slotId: string) {
    return this.slotsCol(eventId).doc(slotId).collection('requests');
  }

  async listSlots(eventId: string): Promise<CareerSlot[]> {
    const snap = await this.slotsCol(eventId)
      .orderBy('scheduledAt', 'asc')
      .get();
    return snap.docs.map((doc) => this.mapSlotDoc(doc));
  }

  async findSlotById(
    eventId: string,
    slotId: string,
  ): Promise<CareerSlot | null> {
    const doc = await this.slotsCol(eventId).doc(slotId).get();
    if (!doc.exists) return null;
    return this.mapSlotDoc(doc);
  }

  async createSlot(
    eventId: string,
    data: Omit<CareerSlot, 'id'>,
  ): Promise<CareerSlot> {
    const ref = await this.slotsCol(eventId).add(data);
    return { id: ref.id, ...data };
  }

  async updateSlot(
    eventId: string,
    slotId: string,
    data: Partial<Omit<CareerSlot, 'id' | 'createdByUid' | 'createdAt'>>,
  ): Promise<void> {
    await this.slotsCol(eventId).doc(slotId).update(data);
  }

  async deleteSlot(eventId: string, slotId: string): Promise<void> {
    await this.slotsCol(eventId).doc(slotId).delete();
  }

  async listRequests(
    eventId: string,
    slotId: string,
  ): Promise<CareerSlotRequest[]> {
    const snap = await this.requestsCol(eventId, slotId)
      .orderBy('requestedAt', 'asc')
      .get();
    return snap.docs.map((doc) => this.mapRequestDoc(doc));
  }

  async findRequestByRequester(
    eventId: string,
    slotId: string,
    requesterUid: string,
  ): Promise<CareerSlotRequest | null> {
    const snap = await this.requestsCol(eventId, slotId)
      .where('requesterUid', '==', requesterUid)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return this.mapRequestDoc(snap.docs[0]);
  }

  async findRequestById(
    eventId: string,
    slotId: string,
    requestId: string,
  ): Promise<CareerSlotRequest | null> {
    const doc = await this.requestsCol(eventId, slotId).doc(requestId).get();
    if (!doc.exists) return null;
    return this.mapRequestDoc(doc);
  }

  async createRequest(
    eventId: string,
    slotId: string,
    data: Omit<CareerSlotRequest, 'id'>,
  ): Promise<CareerSlotRequest> {
    const ref = await this.requestsCol(eventId, slotId).add(data);
    return { id: ref.id, ...data };
  }

  async updateRequest(
    eventId: string,
    slotId: string,
    requestId: string,
    data: { status: CareerSlotRequestStatus; respondedAt: Date },
  ): Promise<void> {
    await this.requestsCol(eventId, slotId).doc(requestId).update(data);
  }

  async countApproved(eventId: string, slotId: string): Promise<number> {
    const snap = await this.requestsCol(eventId, slotId)
      .where('status', '==', 'approved')
      .get();
    return snap.size;
  }

  private mapSlotDoc(doc: FirebaseFirestore.DocumentSnapshot): CareerSlot {
    const data = doc.data()!;
    return {
      id: doc.id,
      title: data['title'] as string,
      description: data['description'] as string,
      scheduledAt: (
        data['scheduledAt'] as FirebaseFirestore.Timestamp
      ).toDate(),
      capacity: data['capacity'] as number,
      requirements: Array.isArray(data['requirements'])
        ? (data['requirements'] as string[])
        : undefined,
      createdByUid: data['createdByUid'] as string,
      createdAt: (data['createdAt'] as FirebaseFirestore.Timestamp).toDate(),
    };
  }

  private mapRequestDoc(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): CareerSlotRequest {
    const data = doc.data()!;
    return {
      id: doc.id,
      requesterUid: data['requesterUid'] as string,
      status: data['status'] as CareerSlotRequestStatus,
      requestedAt: (
        data['requestedAt'] as FirebaseFirestore.Timestamp
      ).toDate(),
      respondedAt: data['respondedAt']
        ? (data['respondedAt'] as FirebaseFirestore.Timestamp).toDate()
        : undefined,
    };
  }
}
