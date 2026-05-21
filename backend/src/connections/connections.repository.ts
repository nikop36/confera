import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type {
  ConnectionRequest,
  ConnectionRequestStatus,
} from '../common/interfaces/connection-request.interface';

@Injectable()
export class ConnectionsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createRequest(
    data: Omit<ConnectionRequest, 'id'>,
  ): Promise<ConnectionRequest> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('connectionRequests').add(data);
    return { id: ref.id, ...data };
  }

  async findById(id: string): Promise<ConnectionRequest | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('connectionRequests').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ConnectionRequest;
  }

  async updateStatus(
    id: string,
    status: ConnectionRequestStatus,
  ): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('connectionRequests').doc(id).update({
      status,
      respondedAt: new Date(),
    });
  }

  async deleteById(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('connectionRequests').doc(id).delete();
  }

  async findPendingBetweenUsers(
    leftUid: string,
    rightUid: string,
  ): Promise<ConnectionRequest | null> {
    const db = this.firebaseService.getFirestore();
    const queries = await Promise.all([
      db
        .collection('connectionRequests')
        .where('requesterUid', '==', leftUid)
        .where('recipientUid', '==', rightUid)
        .where('status', '==', 'pending')
        .limit(1)
        .get(),
      db
        .collection('connectionRequests')
        .where('requesterUid', '==', rightUid)
        .where('recipientUid', '==', leftUid)
        .where('status', '==', 'pending')
        .limit(1)
        .get(),
    ]);

    for (const snapshot of queries) {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as ConnectionRequest;
      }
    }
    return null;
  }

  async findAcceptedBetweenUsers(
    leftUid: string,
    rightUid: string,
  ): Promise<ConnectionRequest | null> {
    const db = this.firebaseService.getFirestore();
    const queries = await Promise.all([
      db
        .collection('connectionRequests')
        .where('requesterUid', '==', leftUid)
        .where('recipientUid', '==', rightUid)
        .where('status', '==', 'accepted')
        .limit(1)
        .get(),
      db
        .collection('connectionRequests')
        .where('requesterUid', '==', rightUid)
        .where('recipientUid', '==', leftUid)
        .where('status', '==', 'accepted')
        .limit(1)
        .get(),
    ]);

    for (const snapshot of queries) {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as ConnectionRequest;
      }
    }
    return null;
  }

  async listByUser(uid: string): Promise<ConnectionRequest[]> {
    const db = this.firebaseService.getFirestore();
    const [requested, received] = await Promise.all([
      db
        .collection('connectionRequests')
        .where('requesterUid', '==', uid)
        .get(),
      db
        .collection('connectionRequests')
        .where('recipientUid', '==', uid)
        .get(),
    ]);

    const docs = [...requested.docs, ...received.docs];
    const dedup = new Map<string, ConnectionRequest>();
    for (const doc of docs) {
      dedup.set(doc.id, { id: doc.id, ...doc.data() } as ConnectionRequest);
    }
    return [...dedup.values()].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
