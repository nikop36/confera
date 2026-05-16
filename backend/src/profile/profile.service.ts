import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UsersRepository } from '../users/users.repository';
import { User, UserProfile } from '../common/interfaces/user.interface';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  async findProfile(uid: string): Promise<(User & UserProfile) | null> {
    return this.usersRepository.findByUid(uid);
  }

  async updateProfile(uid: string, data: Partial<UserProfile>) {
    return this.usersRepository.updateProfile(uid, data);
  }

  async uploadProfileImage(
    uid: string,
    file: Express.Multer.File,
    type: 'profile' | 'background',
  ) {
    const bucket = this.firebaseService.getStorageBucket();
    const extension = file.mimetype.split('/')[1] || 'jpg';
    const token = randomUUID();
    const path = `users/${uid}/${type}-${Date.now()}.${extension}`;
    const storageFile = bucket.file(path);

    await storageFile.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
      resumable: false,
    });

    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    return { url, path };
  }
}
