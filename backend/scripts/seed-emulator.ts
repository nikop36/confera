import * as admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({ projectId: 'confera-app-fcf41' });
const db = admin.firestore();

async function seed() {
  const batch = db.batch();

  // Create test users
  for (let i = 0; i < 50; i++) {
    const ref = db.collection('users').doc(`user-${i}`);
    batch.set(ref, {
      uid: `user-${i}`,
      email: `user${i}@test.com`,
      displayName: `Test User ${i}`,
      role: 'participant',
      profileStatus: 'complete',
      createdAt: new Date(),
    });
  }

  // Create test events
  for (let i = 0; i < 10; i++) {
    const ref = db.collection('events').doc(`event-${i}`);
    batch.set(ref, {
      id: `event-${i}`,
      title: `Test Event ${i}`,
      description: 'Load test event',
      startAt: new Date('2026-09-01'),
      endAt: new Date('2026-09-02'),
      location: 'Test Location',
      capacity: 500,
      registeredCount: 0,
      createdBy: 'user-0',
      createdAt: new Date(),
    });
  }

  await batch.commit();
  console.log('Seed complete');
}

seed().catch(console.error);