import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  RoleRequest,
  RoleRequestStatus,
} from '../common/interfaces/role-request.interface';

@Injectable()
export class RoleRequestsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async saveRoleRequest(data: Omit<RoleRequest, 'id'>): Promise<RoleRequest> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('roleRequest').add(data);

    return { id: ref.id, ...data };
  }

  async findAllPending(): Promise<RoleRequest[]> {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db
      .collection('roleRequests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RoleRequest[];
  }

  async findPendingByUid(uid: string): Promise<RoleRequest | null> {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db
      .collection('roleRequests')
      .where('uid', '==', uid)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as RoleRequest;
  }

  async findById(id: string): Promise<RoleRequest | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('roleRequests').doc(id).get();

    if (!doc.exists) return null;

    return { id: doc.id, ...doc.data() } as RoleRequest;
  }

  async updateStatus(
    id: string,
    status: RoleRequestStatus,
    reviewedBy: string,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();

    await db.collection('roleRequests').doc(id).update({
      status,
      reviewedBy,
      reviewedAt: new Date(),
    });
  }
}
