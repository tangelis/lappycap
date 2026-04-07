import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

/** Minimal channel shape accepted by the visualizer page fetch. */
const MOCK_CHANNELS = {
  channels: [
    {
      id: "qa-alpha",
      title: "QA Alpha",
      description: "Test",
      genre: "test",
      image: "https://example.com/icon.png",
      playlists: [{ url: "https://example.com/x.pls", format: "mp3", quality: "highest" }],
    },
    {
      id: "groovesalad",
      title: "Groove Salad",
      description: "Test",
      genre: "ambient",
      image: "https://example.com/g.png",
      playlists: [{ url: "https://example.com/g.pls", format: "mp3", quality: "highest" }],
    },
  ],
};

test.describe("Visualizer page (functional)", () => {
  test.beforeEach(async ({ page }) => {
    const fulfill = async (route: import("@playwright/test").Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CHANNELS),
      });
    };
    await page.route("https://somafm.com/channels.json", fulfill);
    await page.route("http://somafm.com/channels.json", fulfill);
  });

  test("loads public visualizer with SomaFM controls and session panel", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/visualizer/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /unavailable/i })).toHaveCount(0);
    await expect(page.locator("h1").filter({ hasText: /lappycap demo visualizer/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { name: /somafm live stream/i })).toBeVisible();
    await expect(page.locator('[aria-label="Visualizer preview"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /fullscreen/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /next cue/i })).toBeVisible();
  });

  test("populates station select from mocked channels API", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    const select = page.locator('[aria-label="SomaFM station"]');
    await expect(select).toBeVisible({ timeout: 60_000 });
    await expect(select.locator("option", { hasText: "Groove Salad" })).toBeAttached();
    await expect(select.locator("option", { hasText: "QA Alpha" })).toBeAttached();
  });

  test("Next station updates the selected station", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    const select = page.locator('[aria-label="SomaFM station"]');
    await expect(select).toBeVisible({ timeout: 60_000 });
    await expect(select).toHaveValue("groovesalad");
    await page.getByRole("button", { name: /next station/i }).click();
    await expect(select).toHaveValue("qa-alpha");
  });

  test("Next cue advances preset cue index in UI", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    const preview = page.locator('[aria-label="Visualizer preview"]');
    await expect(preview).toContainText(/cue\s*#\s*0/, { timeout: 60_000 });
    await page.getByRole("button", { name: /next cue/i }).click();
    await expect(preview).toContainText(/cue\s*#\s*1/);
  });

  test("Play is enabled once default station is resolved (no audio assertion)", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    const play = page.getByRole("button", { name: /^play$/i });
    const stop = page.getByRole("button", { name: /^stop$/i });
    await expect(play).toBeVisible({ timeout: 60_000 });
    await expect(stop).toBeDisabled();
    await expect(play).toBeEnabled({ timeout: 60_000 });
  });

  test("Lean-back experience keeps core visualizer chrome", async ({ page }) => {
    await page.goto("/visualizer", { waitUntil: "domcontentloaded" });
    const experience = page.locator('[aria-label="Visualizer experience"]');
    await expect(experience).toBeVisible({ timeout: 60_000 });
    await experience.selectOption("leanback");
    await expect(page.locator("h1").filter({ hasText: /lappycap demo visualizer/i })).toBeVisible();
    await expect(page.locator('[aria-label="Visualizer preview"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /next cue/i })).toBeVisible();
  });
});
