import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

test.describe('Role flow', () => {
  test('user requests organizer role and admin approves', async ({ browser }) => {
    // USER CONTEXT
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    await userPage.goto('/login');
    await userPage.getByLabel('E-Pošta').fill(TEST_EMAIL);
    await userPage.getByLabel('Geslo', { exact: true }).locator('input').fill(TEST_PASSWORD);
    await userPage.click('button[type="submit"]');

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


    // ADMIN CONTEXT
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await adminPage.goto('/login');
    await adminPage.getByLabel('E-Pošta').fill(ADMIN_EMAIL);
    await adminPage.getByLabel('Geslo', { exact: true }).locator('input').fill(ADMIN_PASSWORD);
    await adminPage.click('button[type="submit"]');

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