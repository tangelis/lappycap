import { test, expect } from '@playwright/test';

test.describe('Inspections UX (authenticated)', () => {
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

  test('inspections list has search and sort', async ({ page }) => {
    await page.goto('/dashboard/inspections');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/sort by/i)).toBeVisible();
  });

  test('inspections list shows result count when searching', async ({ page }) => {
    await page.goto('/dashboard/inspections');
    await page.getByPlaceholder(/search/i).fill('nonexistent123');
    await expect(page.getByText(/\d+ result/)).toBeVisible({ timeout: 3_000 });
  });

  test('properties list has search and sort', async ({ page }) => {
    await page.goto('/dashboard/properties');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel(/sort by/i)).toBeVisible();
  });

  test('routes list has search', async ({ page }) => {
    await page.goto('/dashboard/routes');
    await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5_000 });
  });
});
