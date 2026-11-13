import { expect, test } from "@playwright/test";

import { getE2eCredentials, loginThroughUi } from "./helpers";

test.describe("public smoke", () => {
  test("login page renders form and branding", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /เข้าสู่ระบบ|sign in/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /อีเมล|email/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^รหัสผ่าน$|^password$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /เข้าสู่ระบบ|sign in/i })).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login background video is available", async ({ request }) => {
    const response = await request.get("/videos/geometry-lines-dark-login.mp4");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"] ?? "").toMatch(/video|octet-stream/i);
  });
});

test.describe("authenticated smoke", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2eCredentials();
    test.skip(!credentials, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD (min 8 chars) in env");

    await loginThroughUi(page, credentials!.email, credentials!.password);
  });

  test("dashboard loads after login", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /แดชบอร์ด|dashboard/i })).toBeVisible();
  });

  test("primary navigation pages load", async ({ page }) => {
    const paths = ["/pm-work?view=all", "/sites", "/schedule", "/history", "/reports?section=plan", "/settings"];

    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("main.content")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
  });

  test("status tracking links point to external systems", async ({ page }) => {
    await page.goto("/dashboard");

    const isMobile = test.info().project.name.includes("mobile");
    if (isMobile) {
      await page.getByRole("button", { name: /เมนู|menu/i }).click();
    }

    await page.getByRole("button", { name: /ติดตามสถานะ|status tracking/i }).click();

    await expect(page.getByRole("menuitem", { name: /สถานะ CRM|crm status/i })).toHaveAttribute(
      "href",
      "https://jfpm-management.vercel.app/dashboard"
    );
    await expect(page.getByRole("menuitem", { name: /สถานะอุปกรณ์|device status/i })).toHaveAttribute(
      "href",
      "https://nexus.jfavmed.com"
    );
  });
});

test.describe("e2e seed data", () => {
  test.beforeEach(async ({ page }) => {
    const credentials = getE2eCredentials();
    test.skip(!credentials, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in env");

    await loginThroughUi(page, credentials!.email, credentials!.password);
  });

  test("pm-work shows E2E site when seeded", async ({ page }) => {
    test.skip(process.env.E2E_EXPECT_SEED !== "1", "Run npm run seed:e2e and set E2E_EXPECT_SEED=1");

    await page.goto("/pm-work?view=all&owner=__all");
    await expect(page.getByText(/E2E โรงพยาบาลทดสอบ/)).toBeVisible({ timeout: 15_000 });
  });
});
