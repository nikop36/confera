import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from '../common/interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async save(data: User): Promise<User> {
    const db = this.firebaseService.getFirestore();

    await db.collection('users').doc(data.uid).set({
      email: data.email,
      displayName: data.displayName,
      createdAt: data.createdAt,
    });

    return data;
  }

  async findByUid(uid: string): Promise<User | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) return null;

    return { uid: doc.id, ...doc.data() } as User;
  }
}
