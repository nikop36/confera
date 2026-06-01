// Usage: npx ts-node scripts/seed-graph-demo.ts <your-email>
// Seeds realistic demo data: ~10 users, accepted connections, shared meetings
// so the network graph tab looks populated after a year of use.

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '';
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? '';
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY }),
});

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Fake users
// ---------------------------------------------------------------------------

const FAKE_USERS = [
  {
    uid: 'demo-user-ana-kovac',
    email: 'ana.kovac@fmf.uni-lj.si',
    displayName: 'Ana Kovač',
    role: 'participant',
    affiliation: 'Univerza v Ljubljani, FMF',
    bio: 'Raziskujem strojno učenje in NLP. Zanima me praktična uporaba AI v industriji.',
    interests: ['strojno učenje', 'NLP', 'podatkovna analitika'],
    goals: ['networking z industrijo', 'iskanje mentorja', 'izmenjava izkušenj'],
    competencies: ['Python', 'PyTorch', 'statistika'],
    researchKeywords: ['transformerji', 'jezikovni modeli'],
    meetingType: 'both',
    tags: ['AI', 'akademija'],
    profileStatus: 'complete',
    createdAt: daysAgo(365),
  },
  {
    uid: 'demo-user-rok-novak',
    email: 'rok.novak@outfit7.com',
    displayName: 'Rok Novak',
    role: 'industry',
    affiliation: 'Outfit7',
    bio: 'CTO pri Outfit7. Iščem talente in zanimive projekte v mobilnem razvoju.',
    interests: ['mobilni razvoj', 'igre', 'skalabilnost'],
    goals: ['iskanje talentov', 'deljenje izkušenj', 'partnerstva'],
    competencies: ['iOS', 'Android', 'sistem design'],
    researchKeywords: ['mobile gaming', 'real-time sistemi'],
    meetingType: 'in-person',
    tags: ['mobilni', 'gaming'],
    profileStatus: 'complete',
    createdAt: daysAgo(350),
  },
  {
    uid: 'demo-user-maja-petek',
    email: 'maja.petek@ijs.si',
    displayName: 'Maja Petek',
    role: 'participant',
    affiliation: 'Institut Jožef Stefan',
    bio: 'Doktorandka na področju računalniškega vida. Delam na detekciji anomalij v medicinskih slikah.',
    interests: ['računalniški vid', 'medicina', 'globoko učenje'],
    goals: ['iskanje soavtorjev', 'industrijska partnerstva', 'konference'],
    competencies: ['OpenCV', 'TensorFlow', 'MATLAB'],
    researchKeywords: ['detekcija anomalij', 'medicinska analiza slik'],
    meetingType: 'online',
    tags: ['vizija', 'medicina', 'akademija'],
    profileStatus: 'complete',
    createdAt: daysAgo(340),
  },
  {
    uid: 'demo-user-luka-horvat',
    email: 'luka.horvat@celtra.com',
    displayName: 'Luka Horvat',
    role: 'industry',
    affiliation: 'Celtra',
    bio: 'Head of Engineering pri Celtra. Gradimo platformo za kreativno upravljanje v oglaševanju.',
    interests: ['SaaS', 'oglaševanje', 'rast podjetja'],
    goals: ['mreženje z akademijo', 'iskanje talentov'],
    competencies: ['React', 'Node.js', 'AWS', 'vodenje'],
    researchKeywords: ['programmatic advertising', 'creative automation'],
    meetingType: 'both',
    tags: ['SaaS', 'oglaševanje'],
    profileStatus: 'complete',
    createdAt: daysAgo(320),
  },
  {
    uid: 'demo-user-tina-kos',
    email: 'tina.kos@xlab.si',
    displayName: 'Tina Kos',
    role: 'organizer',
    affiliation: 'XLAB',
    bio: 'Organizatorka tehnoloških dogodkov in konferenc. Skrbim za program Confere.',
    interests: ['tech skupnost', 'inovacije', 'startup ekosistem'],
    goals: ['povezovanje skupnosti', 'deljenje znanja'],
    competencies: ['projektno vodenje', 'marketing', 'PR'],
    researchKeywords: ['tech ekosistem', 'startup'],
    meetingType: 'in-person',
    tags: ['skupnost', 'organizacija'],
    profileStatus: 'complete',
    createdAt: daysAgo(310),
  },
  {
    uid: 'demo-user-jan-breznik',
    email: 'jan.breznik@fri.uni-lj.si',
    displayName: 'Jan Breznik',
    role: 'participant',
    affiliation: 'Univerza v Ljubljani, FRI',
    bio: 'Magistrant računalništva. Specializiran za porazdeljene sisteme in oblak.',
    interests: ['oblak', 'kubernetes', 'microservices'],
    goals: ['prva zaposlitev', 'mentorstvo', 'prakse'],
    competencies: ['Go', 'Kubernetes', 'Docker', 'Terraform'],
    researchKeywords: ['porazdeljeni sistemi', 'edge computing'],
    meetingType: 'both',
    tags: ['oblak', 'devops'],
    profileStatus: 'complete',
    createdAt: daysAgo(300),
  },
  {
    uid: 'demo-user-nina-vidmar',
    email: 'nina.vidmar@nib.si',
    displayName: 'Nina Vidmar',
    role: 'participant',
    affiliation: 'Nacionalni inštitut za biologijo',
    bio: 'Bioinformatičarka. Razvijam algortime za analizo genomskih podatkov.',
    interests: ['bioinformatika', 'genomika', 'AI v biologiji'],
    goals: ['interdisciplinarno sodelovanje', 'odprtokodne rešitve'],
    competencies: ['R', 'Python', 'sekveniranje', 'statistika'],
    researchKeywords: ['genomika', 'proteomika', 'bioinformatika'],
    meetingType: 'online',
    tags: ['bioinformatika', 'interdisciplinarno'],
    profileStatus: 'complete',
    createdAt: daysAgo(280),
  },
  {
    uid: 'demo-user-marko-zupan',
    email: 'marko.zupan@petrol.si',
    displayName: 'Marko Zupan',
    role: 'industry',
    affiliation: 'Petrol d.d.',
    bio: 'Digitalna transformacija v energetiki. Vodim projekte uvajanja IoT in podatkovnih rešitev.',
    interests: ['IoT', 'energetika', 'digitalna transformacija'],
    goals: ['akademska partnerstva', 'inovativne rešitve'],
    competencies: ['IoT', 'podatkovne platforme', 'projektno vodenje'],
    researchKeywords: ['smart energy', 'IoT senzorji'],
    meetingType: 'in-person',
    tags: ['energetika', 'IoT'],
    profileStatus: 'complete',
    createdAt: daysAgo(260),
  },
  {
    uid: 'demo-user-sara-oblak',
    email: 'sara.oblak@better.si',
    displayName: 'Sara Oblak',
    role: 'organizer',
    affiliation: 'Better d.o.o.',
    bio: 'Product manager in soustanoviteljica. Gradimo fintech rešitve za jugovzhodno Evropo.',
    interests: ['fintech', 'product management', 'UX'],
    goals: ['investitorji', 'partnerstva', 'rast'],
    competencies: ['product strategy', 'agile', 'UX research'],
    researchKeywords: ['fintech', 'neobank', 'SEE market'],
    meetingType: 'both',
    tags: ['fintech', 'startup'],
    profileStatus: 'complete',
    createdAt: daysAgo(240),
  },
  {
    uid: 'demo-user-gašper-leban',
    email: 'gasper.leban@cosylab.com',
    displayName: 'Gašper Leban',
    role: 'industry',
    affiliation: 'Cosylab',
    bio: 'Software arhitekt pri Cosylab. Specializiran za kontrolne sisteme v delcih in medicinskih napravah.',
    interests: ['kontrolni sistemi', 'real-time', 'embedded'],
    goals: ['iskanje specialistov', 'akademsko sodelovanje'],
    competencies: ['C++', 'EPICS', 'real-time OS', 'Python'],
    researchKeywords: ['kontrolni sistemi', 'pospeševalniki delcev'],
    meetingType: 'in-person',
    tags: ['kontrolni sistemi', 'physics'],
    profileStatus: 'complete',
    createdAt: daysAgo(220),
  },
];

// ---------------------------------------------------------------------------
// Peer-to-peer connections (between fake users — creates cross-edges in graph)
// ---------------------------------------------------------------------------

const PEER_CONNECTIONS: [string, string][] = [
  ['demo-user-ana-kovac',   'demo-user-maja-petek'],   // both researchers / AI
  ['demo-user-ana-kovac',   'demo-user-jan-breznik'],  // both Ljubljana uni students
  ['demo-user-ana-kovac',   'demo-user-nina-vidmar'],  // cross-discipline academia
  ['demo-user-rok-novak',   'demo-user-luka-horvat'],  // both industry/tech leads
  ['demo-user-rok-novak',   'demo-user-gašper-leban'], // industry networking
  ['demo-user-maja-petek',  'demo-user-nina-vidmar'],  // both researchers (IJS / NIB)
  ['demo-user-maja-petek',  'demo-user-jan-breznik'],  // Ljubljana academia
  ['demo-user-luka-horvat', 'demo-user-sara-oblak'],   // both founders/product
  ['demo-user-tina-kos',    'demo-user-sara-oblak'],   // organizer ↔ startup founder
  ['demo-user-tina-kos',    'demo-user-rok-novak'],    // organizer ↔ industry speaker
  ['demo-user-marko-zupan', 'demo-user-gašper-leban'], // both industry, embedded/IoT
  ['demo-user-jan-breznik', 'demo-user-luka-horvat'],  // student ↔ engineering lead
];

// ---------------------------------------------------------------------------
// Rooms & time slots (for meetings)
// ---------------------------------------------------------------------------

const ROOMS = [
  { id: 'demo-room-cankar', name: 'Cankarjeva dvorana', capacity: 8 },
  { id: 'demo-room-prešeren', name: 'Prešernova soba', capacity: 4 },
  { id: 'demo-room-trubar', name: 'Trubarjeva soba', capacity: 6 },
];

// ---------------------------------------------------------------------------
// Meetings: pairs of (selfUid, peerUid) with how many meetings they shared
// ---------------------------------------------------------------------------

const MEETING_PAIRS: [string, number][] = [
  ['demo-user-ana-kovac', 3],
  ['demo-user-rok-novak', 2],
  ['demo-user-maja-petek', 4],
  ['demo-user-luka-horvat', 1],
  ['demo-user-tina-kos', 2],
  ['demo-user-jan-breznik', 3],
  ['demo-user-nina-vidmar', 1],
  ['demo-user-marko-zupan', 2],
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function daysAgo(days: number): admin.firestore.Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return admin.firestore.Timestamp.fromDate(d);
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed(selfUidOrEmail: string) {
  const auth = admin.auth();

  // 1. Resolve UID — accept either a raw UID or an email
  let selfUid: string;
  let selfDisplayName = 'Niko Pozderec';
  let selfEmail = selfUidOrEmail;

  if (selfUidOrEmail.includes('@')) {
    try {
      const record = await auth.getUserByEmail(selfUidOrEmail);
      selfUid = record.uid;
      selfDisplayName = record.displayName ?? selfDisplayName;
    } catch {
      console.error(`No Firebase Auth account found for email: ${selfUidOrEmail}`);
      process.exit(1);
    }
  } else {
    selfUid = selfUidOrEmail;
    try {
      const record = await auth.getUser(selfUid);
      selfDisplayName = record.displayName ?? selfDisplayName;
      selfEmail = record.email ?? selfUidOrEmail;
    } catch {
      // UID exists in Firestore but not Auth — that's fine
    }
  }
  console.log(`✓ Self UID: ${selfUid}`);

  // 2. Ensure self has a complete Firestore profile
  const selfRef = db.collection('users').doc(selfUid);
  const selfDoc = await selfRef.get();
  if (!selfDoc.exists) {
    await selfRef.set({
      email: selfEmail,
      displayName: selfDisplayName,
      role: 'participant',
      profileStatus: 'complete',
      createdAt: daysAgo(365),
      affiliation: 'Confera d.o.o.',
      bio: 'Razvijalec in soustanovitelj Confere. Navdušen nad mrežnenjem in tehnologijo.',
      interests: ['startup', 'AI', 'mreženje', 'produktni razvoj'],
      goals: ['rast skupnosti', 'partnerstva', 'investitorji'],
      competencies: ['TypeScript', 'NestJS', 'React', 'Firebase'],
      researchKeywords: ['conference networking', 'community building'],
      meetingType: 'both',
      tags: ['startup', 'tech'],
    });
    console.log(`✓ Created self Firestore profile`);
  } else {
    console.log(`  Self profile already exists — skipping`);
  }

  // 3. Upsert fake users into Firestore
  console.log(`\nCreating ${FAKE_USERS.length} fake users...`);
  for (const u of FAKE_USERS) {
    const ref = db.collection('users').doc(u.uid);
    await ref.set(u, { merge: true });
    console.log(`  ✓ ${u.displayName} (${u.role})`);
  }

  // 4. Create accepted connection requests (selfUid ↔ each fake user)
  console.log(`\nCreating accepted connections...`);
  const batch = db.batch();
  for (const u of FAKE_USERS) {
    const ref = db.collection('connectionRequests').doc(`demo-conn-${selfUid.slice(0, 8)}-${u.uid.slice(5, 15)}`);
    const existing = await ref.get();
    if (!existing.exists) {
      batch.set(ref, {
        requesterUid: selfUid,
        recipientUid: u.uid,
        status: 'accepted',
        createdAt: u.createdAt,
        respondedAt: admin.firestore.Timestamp.fromDate(
          new Date((u.createdAt as admin.firestore.Timestamp).toDate().getTime() + 86400000 * randomBetween(1, 5))
        ),
      });
      console.log(`  ✓ ↔ ${u.displayName}`);
    } else {
      console.log(`  — ${u.displayName} connection already exists`);
    }
  }
  await batch.commit();

  // 5. Create peer-to-peer connections (cross-edges in the graph)
  console.log(`\nCreating peer-to-peer connections...`);
  for (const [uidA, uidB] of PEER_CONNECTIONS) {
    const connId = `demo-peer-conn-${uidA.slice(5, 15)}-${uidB.slice(5, 15)}`;
    const ref = db.collection('connectionRequests').doc(connId);
    const existing = await ref.get();
    if (!existing.exists) {
      const createdAt = daysAgo(randomBetween(60, 300));
      await ref.set({
        requesterUid: uidA,
        recipientUid: uidB,
        status: 'accepted',
        createdAt,
        respondedAt: admin.firestore.Timestamp.fromDate(
          new Date(createdAt.toDate().getTime() + 86400000 * randomBetween(1, 3))
        ),
      });
      const nameA = FAKE_USERS.find(u => u.uid === uidA)?.displayName ?? uidA;
      const nameB = FAKE_USERS.find(u => u.uid === uidB)?.displayName ?? uidB;
      console.log(`  ✓ ${nameA} ↔ ${nameB}`);
    }
  }

  // 6. Upsert rooms
  console.log(`\nCreating rooms...`);
  for (const room of ROOMS) {
    const ref = db.collection('rooms').doc(room.id);
    await ref.set({ ...room, active: true, createdAt: daysAgo(400) }, { merge: true });
    console.log(`  ✓ ${room.name}`);
  }

  // 6. Create past meetings
  console.log(`\nCreating shared past meetings...`);
  let meetingCount = 0;
  for (const [peerUid, count] of MEETING_PAIRS) {
    for (let i = 0; i < count; i++) {
      const daysOffset = randomBetween(30, 340);
      const meetingDate = daysAgo(daysOffset);
      const slotId = `demo-slot-${peerUid.slice(5)}-${i}`;
      const meetingId = `demo-meeting-${selfUid.slice(0, 8)}-${peerUid.slice(5)}-${i}`;
      const room = pickRandom(ROOMS);

      // Create a time slot
      const slotRef = db.collection('timeSlots').doc(slotId);
      const slotDate = meetingDate.toDate();
      const startAt = new Date(slotDate);
      startAt.setHours(9 + randomBetween(0, 7), 0, 0, 0);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);

      await slotRef.set({
        roomId: room.id,
        startAt: admin.firestore.Timestamp.fromDate(startAt),
        endAt: admin.firestore.Timestamp.fromDate(endAt),
        createdAt: meetingDate,
      }, { merge: true });

      // Create the meeting
      const meetingRef = db.collection('meetings').doc(meetingId);
      const existing = await meetingRef.get();
      if (!existing.exists) {
        await meetingRef.set({
          slotId,
          roomId: room.id,
          requestedByUids: [selfUid],
          requestedToUids: [peerUid],
          participantUids: [selfUid, peerUid],
          status: 'completed',
          createdAt: meetingDate,
        });
        meetingCount++;
      }
    }
  }
  console.log(`  ✓ ${meetingCount} meetings created`);

  console.log(`\n🎉 Seed complete! Open /connections → Graf to see the graph.`);
  process.exit(0);
}

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npx ts-node scripts/seed-graph-demo.ts <uid-or-email>');
  process.exit(1);
}

void seed(arg);
