// Usage: npx ts-node scripts/set-admin.ts <email>
// Example: npx ts-node scripts/set-admin.ts nikopiko36@gmail.com

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '';
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? '';
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
});

async function setAdmin(email: string) {
  const db = admin.firestore();

  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

  if (snapshot.empty) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({ role: 'admin' });

  console.log(`✓ Set role=admin for ${email} (uid: ${doc.id})`);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx ts-node scripts/set-admin.ts <email>');
  process.exit(1);
}

void setAdmin(email);
