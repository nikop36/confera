import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnApplicationBootstrap {
  constructor(private configService: ConfigService) {}

  onApplicationBootstrap() {
    if (!admin.apps.length) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.configService
            .get<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  getFirestore(): admin.firestore.Firestore {
    return admin.firestore();
  }

  getAuth(): admin.auth.Auth {
    return admin.auth();
  }
}
