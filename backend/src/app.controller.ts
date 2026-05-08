import { Controller, Get } from '@nestjs/common';
import { FirebaseService } from './firebase/firebase.service';

@Controller()
export class AppController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Get('firebase-test')
  async testFirebase() {
    const db = this.firebaseService.getFirestore();
    const collections = await db.listCollections();
    return {
      status: 'connected',
      collections: collections.map(c => c.id),
    };
  }
}