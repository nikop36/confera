// Usage: npx ts-node scripts/ensure-user.ts <email> [role]
// Creates a Firestore user document for a Firebase Auth account that has none.
// Role defaults to 'participant'. Use 'admin' to make the user an admin.
// Example: npx ts-node scripts/ensure-user.ts nikopiko36@gmail.com admin

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '';
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? '';
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
});

async function ensureUser(email: string, role: string) {
  const auth = admin.auth();
  const db = admin.firestore();

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch {
    console.error(`No Firebase Auth account found for: ${email}`);
    process.exit(1);
  }

  const uid = userRecord.uid;
  const ref = db.collection('users').doc(uid);
  const existing = await ref.get();

  if (existing.exists) {
    console.log(`Firestore document already exists for ${email} (uid: ${uid})`);
    if (existing.data()?.role !== role) {
      await ref.update({ role });
      console.log(`✓ Updated role to '${role}'`);
    }
    return;
  }

  await ref.set({
    email,
    displayName: userRecord.displayName ?? email.split('@')[0],
    role,
    profileStatus: 'incomplete',
    createdAt: new Date(),
  });

  console.log(`✓ Created Firestore user document for ${email} (uid: ${uid}, role: ${role})`);
}

const email = process.argv[2];
const role = process.argv[3] ?? 'participant';

if (!email) {
  console.error('Usage: npx ts-node scripts/ensure-user.ts <email> [role]');
  process.exit(1);
}

void ensureUser(email, role);
