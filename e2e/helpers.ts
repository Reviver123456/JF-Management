import type { Page } from "@playwright/test";

export function getE2eCredentials() {
  const email = process.env.E2E_TEST_EMAIL?.trim() ?? "";
  const password = process.env.E2E_TEST_PASSWORD ?? "";

  if (!email || password.length < 8) {
    return null;
  }

  return { email, password };
}

export async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /อีเมล|email/i }).fill(email);
  await page.getByRole("textbox", { name: /^รหัสผ่าน$|^password$/i }).fill(password);
  await page.getByRole("button", { name: /เข้าสู่ระบบ|sign in/i }).click();
  await page.waitForURL(/\/(loading|dashboard)/, { timeout: 30_000 });
  if (page.url().includes("/loading")) {
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  }
}
