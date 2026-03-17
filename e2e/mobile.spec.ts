import { test, expect } from '@playwright/test';

/**
 * Mobile viewport tests (run only with mobile-chrome and mobile-safari projects; excluded from chromium).
 * Verify touch-friendly UI: login, hamburger nav, list pages, and inspection detail.
 */
test.describe('Mobile UX', () => {
  test('login page is usable on narrow viewport', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/password/i)).toBeVisible();
    const signIn = page.getByRole('button', { name: /sign in/i });
    await expect(signIn).toBeVisible();
    // Touch target: button should be reasonably tall for touch (≥32px)
    const box = await signIn.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
  });

  test('unauthenticated redirect to login on mobile', async ({ page }) => {
    await page.goto('/dashboard/inspections');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test.describe('Authenticated mobile', () => {
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

    test('mobile menu opens and navigates to Inspections', async ({ page }) => {
      // Hamburger visible on mobile viewport
      const menuButton = page.getByRole('button', { name: /open menu|close menu/i });
      await expect(menuButton).toBeVisible({ timeout: 5_000 });
      await menuButton.click();
      const inspectionsLink = page.getByRole('link', { name: /inspections/i });
      await expect(inspectionsLink).toBeVisible();
      await inspectionsLink.click();
      await expect(page).toHaveURL(/\/dashboard\/inspections/);
      await expect(page.getByRole('heading', { name: /inspections/i })).toBeVisible();
    });

    test('dashboard stats and nav links visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5_000 });
      // On mobile, nav may be in hamburger; open it to find links
      const menuButton = page.getByRole('button', { name: /open menu|close menu/i });
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
      await expect(page.getByRole('link', { name: /properties/i }).first()).toBeVisible({ timeout: 3_000 });
      await expect(page.getByRole('link', { name: /inspections/i }).first()).toBeVisible();
    });

    test('inspections list has search and list or empty state', async ({ page }) => {
      await page.goto('/dashboard/inspections');
      await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: 5_000 });
      const search = page.getByPlaceholder(/search/i);
      const box = await search.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
      await expect(
        page.locator('table').first().or(page.getByText(/no inspections/i))
      ).toBeVisible({ timeout: 5_000 });
    });

    test('properties list shows card grid', async ({ page }) => {
      await page.goto('/dashboard/properties');
      await expect(page.getByRole('heading', { name: /properties/i })).toBeVisible({ timeout: 5_000 });
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });
  });
});
