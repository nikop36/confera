import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { GuestInvitation } from '../common/interfaces/guest-invitations';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class GuestInvitationsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(data: Omit<GuestInvitation, 'id'>): Promise<GuestInvitation> {
    const db = this.firebaseService.getFirestore();
    const ref = db.collection('guestInvitations').doc();
    const invitation: GuestInvitation = { id: ref.id, ...data };
    await ref.set(invitation);
    return invitation;
  }

  async findByToken(token: string): Promise<GuestInvitation | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('guestInvitations')
      .where('confirmationToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GuestInvitation;
  }

  async findByGuestAndEvent(
    guestUid: string,
    eventId: string,
  ): Promise<GuestInvitation | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('guestInvitations')
      .where('guestUid', '==', guestUid)
      .where('eventId', '==', eventId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GuestInvitation;
  }

  async accept(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('guestInvitations').doc(id).update({
      status: 'accepted',
      confirmationToken: FieldValue.delete(),
    });
  }

  async purgeExpired(): Promise<number> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('guestInvitations')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', new Date())
      .get();

    if (snapshot.empty) return 0;
    const batch = db.batch();
    snapshot.docs.forEach((doc) =>
      batch.update(doc.ref, { status: 'expired' }),
    );
    await batch.commit();
    return snapshot.size;
  }
}
