import { test, expect } from '@playwright/test';

test.describe('Auth & access', () => {
  test('login page loads and has email, password, submit', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('unauthenticated user hitting dashboard is sent to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user hitting inspections is sent to login', async ({ page }) => {
    await page.goto('/dashboard/inspections');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user hitting properties is sent to login', async ({ page }) => {
    await page.goto('/dashboard/properties');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
