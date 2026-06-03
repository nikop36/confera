import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import {
  Session,
  SessionRegistration,
  SessionWithMeta,
  Speaker,
} from '../../common/interfaces/event.interface';

export class SessionNotFoundError extends Error {
  constructor() {
    super('Session not found');
    this.name = 'SessionNotFoundError';
    Object.setPrototypeOf(this, SessionNotFoundError.prototype);
  }
}

export class SessionFullError extends Error {
  constructor() {
    super('Session is full');
    this.name = 'SessionFullError';
    Object.setPrototypeOf(this, SessionFullError.prototype);
  }
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async listSessions(
    eventId: string,
    callerUid: string,
  ): Promise<SessionWithMeta[]> {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .orderBy('startAt', 'asc')
      .get();

    if (snapshot.empty) return [];

    // Single getAll call to batch-check all registration docs
    const regRefs = snapshot.docs.map((doc) =>
      doc.ref.collection('sessionRegistrations').doc(callerUid),
    );
    const regDocs = await db.getAll(...regRefs);
    const registeredSessionIds = new Set(
      regDocs.filter((d) => d.exists).map((d) => d.ref.parent.parent!.id),
    );

    return snapshot.docs.map((doc) => ({
      ...this.mapDoc(doc),
      isRegistered: registeredSessionIds.has(doc.id),
    }));
  }

  async createSession(
    eventId: string,
    data: Omit<Session, 'id'>,
  ): Promise<Session> {
    const db = this.firebaseService.getFirestore();
    const ref = await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .add(data);
    return { id: ref.id, ...data };
  }

  async findById(eventId: string, sessionId: string): Promise<Session | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId)
      .get();
    if (!doc.exists) return null;
    return this.mapDoc(doc);
  }

  async updateSession(
    eventId: string,
    sessionId: string,
    data: Partial<
      Omit<Session, 'id' | 'createdBy' | 'createdAt' | 'registeredCount'>
    >,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId)
      .update(data);
  }

  async deleteSession(eventId: string, sessionId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId)
      .delete();
  }

  async registerAtomic(
    eventId: string,
    sessionId: string,
    uid: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const sessionRef = db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId);
    const regRef = sessionRef.collection('sessionRegistrations').doc(uid);

    await db.runTransaction(async (tx) => {
      const sessionDoc = await tx.get(sessionRef);
      if (!sessionDoc.exists) throw new SessionNotFoundError();

      const data = sessionDoc.data()!;
      const capacity = data['capacity'] as number | null;
      const registeredCount = (data['registeredCount'] as number) ?? 0;

      if (capacity !== null && registeredCount >= capacity) {
        throw new SessionFullError();
      }

      const regDoc = await tx.get(regRef);
      if (regDoc.exists) return; // idempotent

      tx.set(regRef, { uid, registeredAt: new Date() });
      tx.update(sessionRef, { registeredCount: registeredCount + 1 });
    });
  }

  async cancelRegistration(
    eventId: string,
    sessionId: string,
    uid: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const sessionRef = db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId);
    const regRef = sessionRef.collection('sessionRegistrations').doc(uid);

    await db.runTransaction(async (tx) => {
      const sessionDoc = await tx.get(sessionRef);
      if (!sessionDoc.exists) return;
      const regDoc = await tx.get(regRef);
      if (!regDoc.exists) return;
      const current = (sessionDoc.data()?.['registeredCount'] as number) ?? 0;
      tx.delete(regRef);
      if (current > 0) {
        tx.update(sessionRef, {
          registeredCount: FieldValue.increment(-1),
        });
      }
    });
  }

  async listRegistrations(
    eventId: string,
    sessionId: string,
  ): Promise<SessionRegistration[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('events')
      .doc(eventId)
      .collection('sessions')
      .doc(sessionId)
      .collection('sessionRegistrations')
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

  private mapDoc(doc: FirebaseFirestore.DocumentSnapshot): Session {
    const data = doc.data()!;
    const session: Session = {
      id: doc.id,
      title: data['title'] as string,
      description: data['description'] as string,
      speakers: (data['speakers'] as Speaker[]) ?? [],
      startAt: (data['startAt'] as FirebaseFirestore.Timestamp).toDate(),
      endAt: (data['endAt'] as FirebaseFirestore.Timestamp).toDate(),
      location: data['location'] as string,
      capacity: (data['capacity'] as number | null) ?? null,
      registeredCount: (data['registeredCount'] as number) ?? 0,
      tags: (data['tags'] as string[] | undefined) ?? [],
      createdBy: data['createdBy'] as string,
      createdAt: (data['createdAt'] as FirebaseFirestore.Timestamp).toDate(),
    };
    if (data['presenterName']) {
      session.presenterName = data['presenterName'] as string;
    }
    if (data['presenterUid']) {
      session.presenterUid = data['presenterUid'] as string;
    }
    if (data['presenterStatus']) {
      session.presenterStatus = data[
        'presenterStatus'
      ] as Session['presenterStatus'];
    }
    if (data['status']) {
      session.status = data['status'] as Session['status'];
    }
    return session;
  }
}
