import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

test.describe('Role flow', () => {
  test('user requests organizer role and admin approves', async ({ browser }) => {
    // USER CONTEXT
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

     // ADMIN CONTEXT
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // ─── Both users log in concurrently ──────────────────────────────────────
    await Promise.all([
      login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD),
      login(userPage, TEST_EMAIL, TEST_PASSWORD),
    ]);

    // User requests organizer role 
    await userPage.goto('/profile');
    await userPage.getByRole('button', { name: 'Organizer' }).click();
    await userPage.getByPlaceholder('Briefly explain why you are requesting this role...').fill(
    'Automated test request'
    );
    await userPage.getByRole('button', { name: 'Submit request' }).click();
    await expect(
        userPage.getByText('Your request was submitted. An administrator will review it.')
    ).toBeVisible();

    // Admin approves request
    await adminPage.goto('/admin/role-requests');
    const requestCard = adminPage.getByText(TEST_EMAIL).first();
    await expect(requestCard).toBeVisible();
    await requestCard
      .locator('button', { hasText: 'Approve' })
      .click();
    await expect(adminPage.getByText(TEST_EMAIL)).not.toBeVisible();

    });
});