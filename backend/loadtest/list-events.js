// loadtest/list-events.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '20s', target: 200 },
    { duration: '20s', target: 500 },
    { duration: '10s', target: 0 },
  ],
};

const BASE_URL = 'http://localhost:3001';
const AUTH_URL = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';

function registerUser(email, password) {
  return http.post(
    `${AUTH_URL}/accounts:signUp?key=fake-api-key`,
    JSON.stringify({ email, password, returnSecureToken: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

function loginUser(email, password) {
  return http.post(
    `${AUTH_URL}/accounts:signInWithPassword?key=fake-api-key`,
    JSON.stringify({ email, password, returnSecureToken: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export default function () {
  const uid = Math.floor(Math.random() * 5000);
  const email = `user${uid}@test.com`;
  const password = 'password123';

  // 1. Register (Auth Emulator)
  registerUser(email, password);

  // 2. Login (Auth Emulator)
  const loginRes = loginUser(email, password);
  const idToken = loginRes.json('idToken');

  check(loginRes, {
    'logged in': (r) => r.status === 200 && idToken,
  });

  // 3. Call your backend with real token
  const res = http.get(`${BASE_URL}/events`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
  });

  sleep(1);
}
