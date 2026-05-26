import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Event,
  EventRegistration,
  EventWithMeta,
} from '../common/interfaces/event.interface';

export class EventFullError extends Error {
  constructor() {
    super('Event is full');
    this.name = 'EventFullError';
    Object.setPrototypeOf(this, EventFullError.prototype);
  }
}

export class EventNotFoundError extends Error {
  constructor() {
    super('Event not found');
    this.name = 'EventNotFoundError';
    Object.setPrototypeOf(this, EventNotFoundError.prototype);
  }
}

@Injectable()
export class EventsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async listEvents(callerUid: string): Promise<EventWithMeta[]> {
    const db = this.firebaseService.getFirestore();

    // Single collectionGroup query for all this user's registrations
    const regSnap = await db
      .collectionGroup('registrations')
      .where('uid', '==', callerUid)
      .get();
    const registeredEventIds = new Set(
      regSnap.docs.map((d) => d.ref.parent.parent!.id),
    );

    const snapshot = await db
      .collection('events')
      .orderBy('startAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      ...this.mapDoc(doc),
      isRegistered: registeredEventIds.has(doc.id),
    }));
  }

  async createEvent(data: Omit<Event, 'id'>): Promise<Event> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('events').add(data);
    return { id: ref.id, ...data };
  }

  async findById(id: string): Promise<Event | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('events').doc(id).get();
    if (!doc.exists) return null;
    return this.mapDoc(doc);
  }

  async updateEvent(
    id: string,
    data: Partial<
      Omit<Event, 'id' | 'createdBy' | 'createdAt' | 'registeredCount'>
    >,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('events').doc(id).update(data);
  }

  async deleteEvent(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('events').doc(id).delete();
  }

  async registerAtomic(eventId: string, uid: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const eventRef = db.collection('events').doc(eventId);
    const regRef = eventRef.collection('registrations').doc(uid);

    await db.runTransaction(async (tx) => {
      const eventDoc = await tx.get(eventRef);
      if (!eventDoc.exists) throw new EventNotFoundError();

      const data = eventDoc.data()!;
      const capacity = data['capacity'] as number;
      const registeredCount = (data['registeredCount'] as number) ?? 0;

      if (registeredCount >= capacity) throw new EventFullError();

      const regDoc = await tx.get(regRef);
      if (regDoc.exists) return; // idempotent

      tx.set(regRef, { uid, registeredAt: new Date() });
      tx.update(eventRef, { registeredCount: registeredCount + 1 });
    });
  }

  async cancelRegistration(eventId: string, uid: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const eventRef = db.collection('events').doc(eventId);
    const regRef = eventRef.collection('registrations').doc(uid);

    await db.runTransaction(async (tx) => {
      const eventDoc = await tx.get(eventRef);
      if (!eventDoc.exists) return;
      const regDoc = await tx.get(regRef);
      if (!regDoc.exists) return;
      const current = (eventDoc.data()?.['registeredCount'] as number) ?? 0;
      tx.delete(regRef);
      if (current > 0) {
        tx.update(eventRef, { registeredCount: FieldValue.increment(-1) });
      }
    });
  }

  async listRegistrations(eventId: string): Promise<EventRegistration[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('events')
      .doc(eventId)
      .collection('registrations')
      .orderBy('registeredAt', 'asc')
      .get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: data['uid'] as string,
        registeredAt: (
          data['registeredAt'] as FirebaseFirestore.Timestamp
        ).toDate(),
      };
    });
  }

  private mapDoc(doc: FirebaseFirestore.DocumentSnapshot): Event {
    const data = doc.data()!;
    return {
      id: doc.id,
      title: data['title'] as string,
      description: data['description'] as string,
      startAt: (data['startAt'] as FirebaseFirestore.Timestamp).toDate(),
      endAt: (data['endAt'] as FirebaseFirestore.Timestamp).toDate(),
      location: data['location'] as string,
      capacity: data['capacity'] as number,
      registeredCount: (data['registeredCount'] as number) ?? 0,
      createdBy: data['createdBy'] as string,
      createdAt: (data['createdAt'] as FirebaseFirestore.Timestamp).toDate(),
    };
  }
}
