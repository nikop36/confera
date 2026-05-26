import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'playwright@confera.com';
const TEST_PASSWORD = 'PlaywrightTest1!';
const TEST_NAME = 'Playwright User';

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