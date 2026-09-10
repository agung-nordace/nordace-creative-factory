import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const profileDir = path.join(process.cwd(), ".local", "lp-sync-browser");
await fs.mkdir(profileDir, { recursive: true });

console.log("");
console.log("ND Creative Factory - Nordace LP Login");
console.log("---------------------------------------");
console.log("1. Login ke lp.nordace.com");
console.log("2. Buka halaman Landing Pages");
console.log("3. Pastikan tabel LP terlihat");
console.log("4. Tutup browser setelah selesai");
console.log("");

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1440, height: 1000 },
  locale: "en-US",
  args: [
    "--disable-blink-features=AutomationControlled",
    "--no-default-browser-check",
  ],
});

const page = context.pages()[0] || (await context.newPage());

await page.goto("https://lp.nordace.com/landing-pages", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

console.log("Browser terbuka. Login seperti biasa lalu tutup browser jika tabel LP sudah terlihat.");

await new Promise((resolve) => {
  context.on("close", resolve);
});
