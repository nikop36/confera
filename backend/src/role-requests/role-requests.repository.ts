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
    const ref = await db.collection('roleRequests').add(data);

    return normalizeRoleRequest(ref.id, data);
  }

  async findAllPending(): Promise<RoleRequest[]> {
    const db = this.firebaseService.getFirestore();

    const snapshot = await db
      .collection('roleRequests')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map((doc) => normalizeRoleRequest(doc.id, doc.data()));
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
    return normalizeRoleRequest(doc.id, doc.data());
  }

  async findById(id: string): Promise<RoleRequest | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('roleRequests').doc(id).get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    return normalizeRoleRequest(doc.id, data);
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

type RoleRequestRecord = {
  uid?: unknown;
  email?: unknown;
  requestedRole?: unknown;
  reason?: unknown;
  status?: unknown;
  reviewedBy?: unknown;
  reviewedAt?: unknown;
  createdAt?: unknown;
};

function normalizeRoleRequest(
  id: string,
  data: RoleRequestRecord,
): RoleRequest {
  return {
    id,
    uid: String(data.uid),
    email: String(data.email),
    requestedRole: String(data.requestedRole) as RoleRequest['requestedRole'],
    reason: typeof data.reason === 'string' ? data.reason : undefined,
    status: String(data.status) as RoleRequest['status'],
    reviewedBy:
      typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined,
    reviewedAt: toDate(data.reviewedAt),
    createdAt: toDate(data.createdAt) ?? new Date(0),
  };
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  if (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  if (typeof value === 'object') {
    const seconds =
      (value as { seconds?: number }).seconds ??
      (value as { _seconds?: number })._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
}
