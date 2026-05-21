import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { Room } from '../common/interfaces/room.interface';
import type { TimeSlot } from '../common/interfaces/time-slot.interface';
import type { Meeting, MeetingStatus } from '../common/interfaces/meeting.interface';

@Injectable()
export class SchedulingRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createRoom(data: Omit<Room, 'id'>): Promise<Room> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('rooms').add(data);
    return { id: ref.id, ...data };
  }

  async listRooms(): Promise<Room[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('rooms').where('active', '==', true).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Room);
  }

  async listAllRooms(): Promise<Room[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('rooms').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Room);
  }

  async findRoomById(id: string): Promise<Room | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('rooms').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Room;
  }

  async updateRoom(id: string, data: Partial<Omit<Room, 'id' | 'createdAt'>>): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('rooms').doc(id).update(data);
  }

  async deleteRoom(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('rooms').doc(id).delete();
  }

  async listTimeSlotsInRange(startAt: Date, endAt: Date): Promise<TimeSlot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('timeSlots')
      .where('startAt', '>=', startAt)
      .where('startAt', '<', endAt)
      .orderBy('startAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TimeSlot);
  }

  async createTimeSlots(data: Omit<TimeSlot, 'id'>[]): Promise<TimeSlot[]> {
    if (!data.length) return [];

    const db = this.firebaseService.getFirestore();
    const batch = db.batch();
    const refs = data.map(() => db.collection('timeSlots').doc());

    refs.forEach((ref, index) => {
      batch.set(ref, data[index]);
    });

    await batch.commit();
    return refs.map((ref, index) => ({ id: ref.id, ...data[index] }));
  }

  async findTimeSlotById(id: string): Promise<TimeSlot | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('timeSlots').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as TimeSlot;
  }

  async updateTimeSlot(
    id: string,
    data: Partial<Omit<TimeSlot, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('timeSlots').doc(id).update(data);
  }

  async deleteTimeSlot(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('timeSlots').doc(id).delete();
  }

  async findMeetingByRoomAndSlot(roomId: string, slotId: string): Promise<Meeting | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('meetings')
      .where('roomId', '==', roomId)
      .where('slotId', '==', slotId)
      .where('status', '==', 'scheduled')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Meeting;
  }

  async findMeetingsForParticipantAtSlot(uid: string, slotId: string): Promise<Meeting[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('meetings')
      .where('slotId', '==', slotId)
      .where('status', '==', 'scheduled')
      .where('participantUids', 'array-contains', uid)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Meeting);
  }

  async createMeeting(data: Omit<Meeting, 'id'>): Promise<Meeting> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('meetings').add(data);
    return { id: ref.id, ...data };
  }

  async listMeetings(): Promise<Meeting[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('meetings')
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Meeting);
  }

  async findMeetingsByRoomId(roomId: string): Promise<Meeting[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('meetings').where('roomId', '==', roomId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Meeting);
  }

  async findMeetingsBySlotId(slotId: string): Promise<Meeting[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('meetings').where('slotId', '==', slotId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Meeting);
  }

  async findMeetingById(id: string): Promise<Meeting | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('meetings').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Meeting;
  }

  async deleteMeeting(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('meetings').doc(id).delete();
  }

  async updateMeetingStatus(id: string, status: MeetingStatus): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('meetings').doc(id).update({ status });
  }
}
