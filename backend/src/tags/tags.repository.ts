import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { Tag } from '../common/interfaces/tag.interface';

@Injectable()
export class TagsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async listAll(): Promise<Tag[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db.collection('tags').orderBy('slug', 'asc').get();
    return snap.docs.map((doc) => this.mapDoc(doc));
  }

  async findBySlug(slug: string): Promise<Tag | null> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection('tags')
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return this.mapDoc(doc);
  }

  async create(data: Omit<Tag, 'id'>): Promise<Tag> {
    const db = this.firebaseService.getFirestore();
    const ref = await db.collection('tags').add(data);
    return { id: ref.id, ...data };
  }

  async deleteById(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection('tags').doc(id).delete();
  }

  private mapDoc(doc: FirebaseFirestore.DocumentSnapshot): Tag {
    const data = doc.data()!;
    return {
      id: doc.id,
      label: data['label'] as string,
      slug: data['slug'] as string,
      createdAt: (data['createdAt'] as FirebaseFirestore.Timestamp).toDate(),
    };
  }
}
