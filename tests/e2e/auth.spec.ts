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

    // after registration user should land on dashboard or profile page
    await expect(page).toHaveURL(/dashboard|profile/);
  });

  test('user can log in successfully', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await page.getByLabel('Geslo').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /Prijavite se/i }).click();

    await expect(page).toHaveURL(/dashboard|home/);
  });

  test('login fails with wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await page.getByLabel('Geslo').fill('WrongPassword1!');
    await page.getByRole('button', { name: /Prijavite se/i }).click();

    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible();
  });

  test('register fails with weak password', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('E-pošta').fill('another@confera.com');
    await page.getByLabel('Geslo').fill('weak');
    await page.getByLabel('Polno ime').fill('Another User');
    await page.getByRole('button', { name: /Ustvari račun/i }).click();

    await expect(page.getByText(/password/i)).toBeVisible();
  });
});