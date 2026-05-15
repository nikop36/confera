// Usage: npx ts-node scripts/get-token.ts

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const EMAIL = process.env.TEST_USER_EMAIL ?? '';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? '';
const API_KEY = process.env.FIREBASE_API_KEY ?? '';

async function getToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  const data = (await res.json()) as {
    idToken?: string;
    error?: { message: string };
  };

  if (!res.ok) {
    console.error('Failed:', data.error?.message);
    process.exit(1);
  }

  console.log('\nYour Firebase ID token:\n');
  console.log(data.idToken);
  console.log('\nCopy this into Swagger → Authorize → Bearer <token>\n');
}

void getToken();
