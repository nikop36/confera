import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;
const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL!;
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD!;

const EVENT_TITLE = `Playwright Test Event ${Date.now()}`;
const EVENT_DATE = '2026-09-15';
const EVENT_START = `${EVENT_DATE}T10:00`;
const EVENT_END = `${EVENT_DATE}T12:00`;
const EVENT_LOCATION = 'Test Hall A';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

test.describe('Events story: organizer creates → user joins → user cancels → organizer deletes', () => {
  test('full event lifecycle', async ({ browser }) => {

    // ─── Set up both browser contexts ────────────────────────────────────────
    const organizerContext = await browser.newContext();
    const userContext = await browser.newContext();

    const organizerPage = await organizerContext.newPage();
    const userPage = await userContext.newPage();

    // ─── Both users log in concurrently ──────────────────────────────────────
    await Promise.all([
      login(organizerPage, ORGANIZER_EMAIL, ORGANIZER_PASSWORD),
      login(userPage, TEST_EMAIL, TEST_PASSWORD),
    ]);

    // =========================================================================
    // ACT 1 — Organizer creates an event
    // =========================================================================

    await organizerPage.goto('/events');

    const addButton = organizerPage.getByRole('button', { name: /add|dodaj/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    const modal = organizerPage.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.getByLabel(/title|naziv/i).fill(EVENT_TITLE);
    await modal.getByLabel(/location|lokacija/i).fill(EVENT_LOCATION);
    await modal.getByLabel(/start|začetek/i).fill(EVENT_START);
    await modal.getByLabel(/end|konec/i).fill(EVENT_END);

    const capacityField = modal.getByLabel(/capacity|kapaciteta/i);
    if (await capacityField.isVisible()) {
      await capacityField.fill('50');
    }

    await modal.getByRole('button', { name: /save|shrani/i }).click();

    await expect(modal).not.toBeVisible();
    await expect(organizerPage.getByText(EVENT_TITLE)).toBeVisible();

    // =========================================================================
    // ACT 2 — User sees the event on the home page and navigates to it
    // =========================================================================

    await userPage.goto('/home');

    await expect(userPage.getByText(EVENT_TITLE)).toBeVisible({ timeout: 10_000 });

    await userPage.getByText(EVENT_TITLE).first().click();
    await userPage.waitForURL(/\/events\/.+/);

    await expect(userPage.getByRole('heading', { name: EVENT_TITLE })).toBeVisible();

    // =========================================================================
    // ACT 3 — User registers for the event
    // =========================================================================

    const registerButton = userPage.getByRole('button', { name: /register|registracija/i });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    await expect(
      userPage.getByRole('button', { name: /registered|odjavi/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(userPage.getByText(/1\s*\/\s*\d+/)).toBeVisible();

    // =========================================================================
    // ACT 4 — Organizer confirms the registration count increased
    // =========================================================================

    await organizerPage.goto('/events');
    const eventCard = organizerPage.getByText(EVENT_TITLE).first();
    await expect(eventCard).toBeVisible();

    await expect(organizerPage.getByText(/1\s*\/\s*50/)).toBeVisible();

    // =========================================================================
    // ACT 5 — User cancels their registration
    // =========================================================================

    const cancelButton = userPage.getByRole('button', { name: /registered|odjavi/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    await expect(
      userPage.getByRole('button', { name: /^register$|^registracija$/i }),
    ).toBeVisible({ timeout: 5_000 });

    await expect(userPage.getByText(/0\s*\/\s*\d+/)).toBeVisible();

    // =========================================================================
    // ACT 6 — Organizer deletes the event
    // =========================================================================

    await organizerPage.goto('/events');
    await expect(organizerPage.getByText(EVENT_TITLE)).toBeVisible();

    await organizerPage.getByText(EVENT_TITLE).first().click();

    const deleteButton = organizerPage
      .getByText(EVENT_TITLE)
      .locator('..')
      .getByRole('button', { name: /delete|izbriši/i });

    await expect(deleteButton).toBeVisible();

    organizerPage.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();

    await expect(organizerPage.getByText(EVENT_TITLE)).not.toBeVisible({ timeout: 5_000 });

    // ─── Clean up ─────────────────────────────────────────────────────────────
    await organizerContext.close();
    await userContext.close();
  });
});