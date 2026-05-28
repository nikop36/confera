import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User, UserProfile } from '../common/interfaces/user.interface';
import { UserRoleEnum } from '../common/enums/roles.enum';

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
}
