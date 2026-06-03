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
    const snap = await this.slotsCol(eventId).orderBy('startAt', 'asc').get();
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

  async getEventCreatedBy(eventId: string): Promise<string | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('events').doc(eventId).get();
    if (!doc.exists) return null;
    return (doc.data()?.['createdBy'] as string) ?? null;
  }

  async getEventTitle(eventId: string): Promise<string | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('events').doc(eventId).get();
    if (!doc.exists) return null;
    return (doc.data()?.['title'] as string) ?? null;
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

  async findApprovedBySubSlotIndex(
    eventId: string,
    slotId: string,
    subSlotIndex: number,
  ): Promise<CareerSlotRequest | null> {
    const snap = await this.requestsCol(eventId, slotId)
      .where('subSlotIndex', '==', subSlotIndex)
      .where('status', '==', 'approved')
      .limit(1)
      .get();
    if (snap.empty) return null;
    return this.mapRequestDoc(snap.docs[0]);
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

  async writeCareerBooking(data: {
    id: string;
    requesterUid: string;
    eventId: string;
    eventTitle: string;
    slotId: string;
    slotTitle: string;
    location: string;
    slotStartAt: Date;
    slotEndAt: Date;
    capacity: number;
    subSlotIndex: number;
    industryMemberUid: string;
    industryMemberName: string;
    approvedAt: Date;
  }): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('careerBookings').doc(data.id).set(data);
  }

  async findBookingsByRequester(requesterUid: string): Promise<Array<{
    id: string;
    requesterUid: string;
    eventId: string;
    eventTitle: string;
    slotId: string;
    slotTitle: string;
    location: string;
    slotStartAt: Date;
    slotEndAt: Date;
    capacity: number;
    subSlotIndex: number;
    industryMemberUid: string;
    industryMemberName: string;
  }>> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('careerBookings')
      .where('requesterUid', '==', requesterUid)
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        requesterUid: d['requesterUid'] as string,
        eventId: d['eventId'] as string,
        eventTitle: d['eventTitle'] as string,
        slotId: d['slotId'] as string,
        slotTitle: d['slotTitle'] as string,
        location: d['location'] as string,
        slotStartAt: (d['slotStartAt'] as FirebaseFirestore.Timestamp).toDate(),
        slotEndAt: (d['slotEndAt'] as FirebaseFirestore.Timestamp).toDate(),
        capacity: d['capacity'] as number,
        subSlotIndex: d['subSlotIndex'] as number,
        industryMemberUid: d['industryMemberUid'] as string,
        industryMemberName: d['industryMemberName'] as string,
      };
    });
  }

  async countApproved(eventId: string, slotId: string): Promise<number> {
    const snap = await this.requestsCol(eventId, slotId)
      .where('status', '==', 'approved')
      .get();
    return snap.size;
  }

  private mapSlotDoc(doc: FirebaseFirestore.DocumentSnapshot): CareerSlot {
    const data = doc.data()!;
    const slot: CareerSlot = {
      id: doc.id,
      title: data['title'] as string,
      description: data['description'] as string,
      startAt: (data['startAt'] as FirebaseFirestore.Timestamp).toDate(),
      endAt: (data['endAt'] as FirebaseFirestore.Timestamp).toDate(),
      location: data['location'] as string,
      capacity: data['capacity'] as number,
      requirements: Array.isArray(data['requirements'])
        ? (data['requirements'] as string[])
        : undefined,
      createdByUid: data['createdByUid'] as string,
      createdAt: (data['createdAt'] as FirebaseFirestore.Timestamp).toDate(),
    };
    if (data['approvalStatus']) {
      slot.approvalStatus = data['approvalStatus'] as CareerSlot['approvalStatus'];
    }
    return slot;
  }

  private mapRequestDoc(
    doc: FirebaseFirestore.DocumentSnapshot,
  ): CareerSlotRequest {
    const data = doc.data()!;
    return {
      id: doc.id,
      requesterUid: data['requesterUid'] as string,
      subSlotIndex: data['subSlotIndex'] as number,
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
