import { test, expect } from '@playwright/test';

test.describe('Dashboard (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('dashboard shows stats and nav', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: /properties/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /inspections/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /routes/i })).toBeVisible();
  });

  test('can open inspections list', async ({ page }) => {
    await page.getByRole('link', { name: /inspections/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/inspections/);
    await expect(page.getByRole('heading', { name: /inspections/i })).toBeVisible();
  });

  test('can open properties list', async ({ page }) => {
    await page.getByRole('link', { name: /properties/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/properties/);
    await expect(page.getByRole('heading', { name: /properties/i })).toBeVisible();
  });

  test('dashboard shows Open Issues stat', async ({ page }) => {
    await expect(page.getByText(/open issues/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('can open Issues page from nav', async ({ page }) => {
    await page.getByRole('link', { name: /issues/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/issues/);
    await expect(page.getByRole('heading', { name: /open issues/i })).toBeVisible();
  });
});
