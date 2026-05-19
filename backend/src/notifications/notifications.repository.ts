import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { Notification } from '../common/interfaces/notification.interface';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(data: Omit<Notification, 'id'>): Promise<Notification> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('notifications').add(data);
    return { id: ref.id, ...data };
  }

  // Returns last 30 unarchived notifications for a user
  // cursor is the createdAt timestamp of the last notification received
  async findAllByUid(
    uid: string,
    cursor?: admin.firestore.Timestamp,
  ): Promise<Notification[]> {
    const db = this.firebaseService.getFirestore();

    let query = db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('archived', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(30);

    // If cursor provided, start after the last document from previous page
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  }

  async findById(id: string): Promise<Notification | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('notifications').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Notification;
  }

  async markAsRead(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('notifications').doc(id).update({ read: true });
  }

  async markAllAsRead(uid: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('read', '==', false)
      .where('archived', '==', false)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  }

  async archive(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('notifications').doc(id).update({ archived: true });
  }
}
