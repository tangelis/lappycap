import { test, expect } from '@playwright/test';

test.describe('Open issues (authenticated)', () => {
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

  test('issues page loads with heading and content', async ({ page }) => {
    await page.goto('/dashboard/issues');
    await expect(page.getByRole('heading', { name: /open issues/i })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/checklist items marked as issue/i)).toBeVisible();
  });

  test('issues page has link to inspections', async ({ page }) => {
    await page.goto('/dashboard/issues');
    await expect(page.getByRole('link', { name: /inspections/i }).first()).toBeVisible({ timeout: 5_000 });
  });
});
