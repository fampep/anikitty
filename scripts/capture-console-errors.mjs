import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const paths = ["/home", "/anime/watch?anime=21&type=latest"];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on("console", (msg) => {
  const type = msg.type();
  const text = msg.text();
  if (type === "error" || text.includes("Maximum update") || text.includes("error #")) {
    errors.push({ path: "pending", type, text });
  }
});

page.on("pageerror", (err) => {
  errors.push({ path: "pending", type: "pageerror", text: err.message, stack: err.stack });
});

for (const path of paths) {
  errors.forEach((e) => {
    if (e.path === "pending") e.path = path;
  });
  console.log(`\n=== Visiting ${BASE}${path} ===`);
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log("Navigation issue:", e.message);
  }
  const tagged = errors.filter((e) => e.path === path || e.path === "pending");
  if (tagged.length === 0) {
    console.log("No React/console errors captured.");
  } else {
    for (const e of tagged) {
      console.log(`[${e.type}] ${e.text}`);
      if (e.stack) console.log(e.stack.split("\n").slice(0, 8).join("\n"));
    }
  }
}

await browser.close();
