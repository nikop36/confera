import { test, expect, type Page, type APIResponse } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const PEER_EMAIL = process.env.ORGANIZER_EMAIL!;
const PEER_PASSWORD = process.env.ORGANIZER_PASSWORD!;

type StoredUser = {
  uid: string;
  email: string;
  idToken: string;
  displayName: string;
};

type ConnectionItem = {
  id: string;
  counterpart: { uid: string; email: string; displayName: string };
};

type ConnectionsResponse = {
  pendingReceived: ConnectionItem[];
  pendingSent: ConnectionItem[];
  accepted: ConnectionItem[];
};

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

async function getStoredUser(page: Page): Promise<StoredUser> {
  const user = await page.evaluate(() => {
    const raw = window.localStorage.getItem('confera_user');
    return raw ? JSON.parse(raw) : null;
  });

  if (!user?.uid || !user?.idToken || !user?.email) {
    throw new Error('Logged-in user was not stored in localStorage');
  }

  return user as StoredUser;
}

async function getConnections(page: Page, token: string) {
  const response = await page.request.get('/connections/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ConnectionsResponse;
}

async function expectOk(response: APIResponse) {
  if (!response.ok()) {
    throw new Error(
      `Expected ${response.url()} to succeed, got ${response.status()}: ${await response.text()}`,
    );
  }
}

async function cleanupConnectionBetween(
  actorPage: Page,
  actor: StoredUser,
  peerPage: Page,
  peer: StoredUser,
) {
  const seen = new Set<string>();
  const actorConnections = await getConnections(actorPage, actor.idToken);
  const peerConnections = await getConnections(peerPage, peer.idToken);

  for (const item of actorConnections.accepted) {
    if (item.counterpart.uid === peer.uid && !seen.has(item.id)) {
      seen.add(item.id);
      await expectOk(
        await actorPage.request.delete(`/connections/${item.id}`, {
          headers: { Authorization: `Bearer ${actor.idToken}` },
        }),
      );
    }
  }

  for (const item of peerConnections.accepted) {
    if (item.counterpart.uid === actor.uid && !seen.has(item.id)) {
      seen.add(item.id);
      await expectOk(
        await peerPage.request.delete(`/connections/${item.id}`, {
          headers: { Authorization: `Bearer ${peer.idToken}` },
        }),
      );
    }
  }

  for (const item of actorConnections.pendingReceived) {
    if (item.counterpart.uid === peer.uid && !seen.has(item.id)) {
      seen.add(item.id);
      await expectOk(
        await actorPage.request.patch(`/connections/requests/${item.id}/reject`, {
          headers: { Authorization: `Bearer ${actor.idToken}` },
        }),
      );
    }
  }

  for (const item of peerConnections.pendingReceived) {
    if (item.counterpart.uid === actor.uid && !seen.has(item.id)) {
      seen.add(item.id);
      await expectOk(
        await peerPage.request.patch(`/connections/requests/${item.id}/reject`, {
          headers: { Authorization: `Bearer ${peer.idToken}` },
        }),
      );
    }
  }
}

test.describe('Connections flow', () => {
  test('user sends a connection request and recipient approves it', async ({
    browser,
  }) => {
    const userContext = await browser.newContext();
    const peerContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const peerPage = await peerContext.newPage();

    await Promise.all([
      login(userPage, TEST_EMAIL, TEST_PASSWORD),
      login(peerPage, PEER_EMAIL, PEER_PASSWORD),
    ]);

    const user = await getStoredUser(userPage);
    const peer = await getStoredUser(peerPage);
    await cleanupConnectionBetween(userPage, user, peerPage, peer);

    await userPage.goto(`/profile/${peer.uid}`);
    await expect(
      userPage.getByRole('button', { name: /connect|poveži/i }),
    ).toBeVisible();
    await userPage.getByRole('button', { name: /connect|poveži/i }).click();
    await expect(
      userPage.getByRole('button', { name: /pending|čaka/i }),
    ).toBeVisible();

    await peerPage.goto('/connections');
    await expect(peerPage.getByText(user.email)).toBeVisible();
    await peerPage.getByRole('button', { name: /approve|potrdi/i }).click();

    await peerPage.getByRole('button', { name: /connections|povezave/i }).click();
    await expect(peerPage.getByText(user.email)).toBeVisible();

    await userPage.goto('/connections?tab=povezave');
    await expect(userPage.getByText(peer.email)).toBeVisible();

    await cleanupConnectionBetween(userPage, user, peerPage, peer);
    await userContext.close();
    await peerContext.close();
  });

  test('duplicate pending connection requests are rejected', async ({
    browser,
  }) => {
    const userContext = await browser.newContext();
    const peerContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const peerPage = await peerContext.newPage();

    await Promise.all([
      login(userPage, TEST_EMAIL, TEST_PASSWORD),
      login(peerPage, PEER_EMAIL, PEER_PASSWORD),
    ]);

    const user = await getStoredUser(userPage);
    const peer = await getStoredUser(peerPage);
    await cleanupConnectionBetween(userPage, user, peerPage, peer);

    const first = await userPage.request.post('/connections/requests', {
      headers: {
        Authorization: `Bearer ${user.idToken}`,
        'Content-Type': 'application/json',
      },
      data: { recipientUid: peer.uid },
    });
    await expectOk(first);

    const duplicate = await userPage.request.post('/connections/requests', {
      headers: {
        Authorization: `Bearer ${user.idToken}`,
        'Content-Type': 'application/json',
      },
      data: { recipientUid: peer.uid },
    });
    expect(duplicate.status()).toBe(400);
    expect(await duplicate.json()).toMatchObject({
      message: 'A pending connection request already exists',
    });

    await cleanupConnectionBetween(userPage, user, peerPage, peer);
    await userContext.close();
    await peerContext.close();
  });
});
