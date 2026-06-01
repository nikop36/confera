import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User, UserProfile } from '../common/interfaces/user.interface';
import { UserRoleEnum } from '../common/enums/roles.enum';
import { FieldValue } from 'firebase-admin/firestore';

@Injectable()
export class UsersRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async saveUser(data: User): Promise<User> {
    const db = this.firebaseService.getFirestore();

    await db.collection('users').doc(data.uid).set({
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      profileStatus: data.profileStatus,
      createdAt: data.createdAt,
    });

    return data;
  }

  async findByUid(uid: string): Promise<(User & UserProfile) | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) return null;

    return { uid: doc.id, ...doc.data() } as User & UserProfile;
  }

  async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const db = this.firebaseService.getFirestore();

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    await db.collection('users').doc(uid).update(cleanData);
  }

  async updateUserRole(uid: string, role: UserRoleEnum): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('users').doc(uid).update({ role });
  }

  async listUsers(limit = 200): Promise<Array<User & UserProfile>> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('users')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) => ({ uid: doc.id, ...doc.data() }) as User & UserProfile,
    );
  }

  async findByEmail(email: string): Promise<(User & UserProfile) | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() } as User & UserProfile;
  }

  async createGuestUser(email: string, displayName: string): Promise<User> {
    const db = this.firebaseService.getFirestore();

    const existing = await this.findByEmail(email);
    if (existing) return existing;

    const uid = db.collection('users').doc().id;

    const guest: User = {
      uid,
      email,
      displayName,
      role: UserRoleEnum.GUEST,
      profileStatus: 'incomplete',
      guestStatus: 'pending',
      createdAt: new Date(),
    };

    await db.collection('users').doc(uid).set(guest);
    return guest;
  }

  async confirmGuest(uid: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('users').doc(uid).update({
      guestStatus: 'confirmed',
    });
  }

  async upgradeGuestToParticipant(
    email: string,
    realUid: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();

    const existing = await this.findByEmail(email);
    if (!existing || existing.role !== UserRoleEnum.GUEST) return;

    const batch = db.batch();

    // Write new document with real Firebase uid
    const newRef = db.collection('users').doc(realUid);
    batch.set(newRef, {
      ...existing,
      uid: realUid,
      role: UserRoleEnum.PARTICIPANT,
      profileStatus: 'incomplete',
      guestStatus: FieldValue.delete(),
      confirmationToken: FieldValue.delete(),
      confirmationExpiresAt: FieldValue.delete(),
    });

    // Delete old guest document
    const oldRef = db.collection('users').doc(existing.uid);
    batch.delete(oldRef);

    await batch.commit();
  }

  async purgeExpiredGuests(): Promise<number> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('users')
      .where('role', '==', UserRoleEnum.GUEST)
      .where('guestStatus', '==', 'pending')
      .where('createdAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .get();

    if (snapshot.empty) return 0;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
  }

  async deleteAccountData(uid: string): Promise<void> {
    const db = this.firebaseService.getFirestore();

    await Promise.all([
      db.collection('users').doc(uid).delete(),
      this.deleteCollectionByField('connectionRequests', 'requesterUid', uid),
      this.deleteCollectionByField('connectionRequests', 'recipientUid', uid),
      this.deleteCollectionByField('notifications', 'userUid', uid),
      this.deleteCollectionByField('roleRequests', 'requesterUid', uid),
    ]);
  }

  private async deleteCollectionByField(
    collectionName: string,
    fieldName: string,
    value: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(collectionName)
      .where(fieldName, '==', value)
      .limit(1000)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
