import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'playwright@confera.com';
const TEST_PASSWORD = 'PlaywrightTest1!';
const TEST_NAME = 'Playwright User';

test.describe('Protected routes', () => {
  test('redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/events');

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fevents$/);
    await expect(
      page.getByRole('heading', { name: 'Prijavite se' }),
    ).toBeVisible();
  });

  test('rejects a forged or expired stored session', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'confera_user',
        JSON.stringify({
          uid: 'fake-user',
          displayName: 'Fake User',
          email: 'fake@example.com',
          role: 'admin',
          idToken: 'invalid-token',
        }),
      );
    });
    await page.route('**/profile/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid or expired token' }),
      });
    });

    await page.goto('/events');

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fevents$/);
    const storedUser = await page.evaluate(() =>
      window.localStorage.getItem('confera_user'),
    );
    expect(storedUser).toBeNull();
  });

  test('uses the server-confirmed role for admin routes', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'confera_user',
        JSON.stringify({
          uid: 'participant-user',
          displayName: 'Participant User',
          email: 'participant@example.com',
          role: 'admin',
          idToken: 'valid-participant-token',
        }),
      );
    });
    await page.route('**/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uid: 'participant-user',
          displayName: 'Participant User',
          email: 'participant@example.com',
          role: 'participant',
        }),
      });
    });

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe('Auth flow', () => {
  test('user can register successfully', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await page.getByLabel('Geslo').fill(TEST_PASSWORD);
    await page.getByLabel('Polno ime').fill(TEST_NAME);

    await page.getByRole('button', { name: /Ustvari račun/i }).click();

    const errorOrRedirect = await Promise.race([
      page.waitForURL(/home/, { timeout: 15000 }).then(() => 'redirected'),
      page.locator('[style*="d14242"]').waitFor({ timeout: 15000 }).then(() => 'error'),
    ]);

    if (errorOrRedirect === 'error') {
      const errorText = await page.locator('[style*="d14242"]').textContent();
      throw new Error(`Registration failed with error: ${errorText}`);
    }

    await expect(page).toHaveURL(/home/);
  });

  test('user can log in successfully', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: 'Geslo' }).fill(TEST_PASSWORD);
  
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/profile|home/, { timeout: 15000 });
    await expect(page).toHaveURL(/profile|home/);
  });

  test('login fails with wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: 'Geslo' }).fill('WrongPassword1!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('form')).toContainText(
      /napaka|neveljavno|geslo|invalid|incorrect|error/i,
      { timeout: 10000 },
    );
  });

  test('register fails with weak password', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('E-pošta').fill('another@confera.com');
    await page.getByLabel('Geslo').fill('weak');
    await page.getByLabel('Polno ime').fill('Another User');
    await page.getByRole('button', { name: /Ustvari račun/i }).click();

    await expect(page.getByText(/uppercase/i)).toBeVisible();
  });
});
