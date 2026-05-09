#!/usr/bin/env node
/**
 * Scrapes the @DRCksu timeline from x.com using Playwright.
 *
 * Usage:
 *   1. Install Playwright (one-time):
 *        cd <repo>
 *        npm i -D playwright
 *        npx playwright install chromium
 *
 *   2. First run — you log in manually in the browser window that opens:
 *        node scripts/scrape-x.mjs
 *      Cookies persist under scripts/data/.x-profile/, so you log in once.
 *
 *   3. Subsequent runs reuse the saved session:
 *        node scripts/scrape-x.mjs > scripts/data/drcksu-tweets.json
 *
 * Output:
 *   - Prints JSON array of posts to stdout.
 *   - Downloads images into scripts/data/x-images/<tweet-id>__<idx>.<ext>.
 *   - Each post: { id, url, text, createdAt, lang, images:[{src,localPath}],
 *                  videos:[src], stats:{replies,reposts,likes,bookmarks,views} }
 *
 * Notes:
 *   - X requires auth in 2026. The script opens a non-headless browser so you
 *     can log in once. Subsequent runs are silent unless cookies expire.
 *   - The script auto-scrolls until it stops finding new tweets, with a cap
 *     (MAX_SCROLLS) to avoid infinite loops on rate-limited responses.
 *   - All console output other than the final JSON goes to stderr so you can
 *     pipe stdout to a file safely.
 */

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, "data", ".x-profile");
const IMG_DIR = path.join(__dirname, "data", "x-images");
const HANDLE = process.env.X_HANDLE || "DRCksu";
const TIMELINE_URL = `https://x.com/${HANDLE}`;
const MAX_SCROLLS = Number(process.env.MAX_SCROLLS || 80);
const SCROLL_PAUSE_MS = Number(process.env.SCROLL_PAUSE_MS || 1500);

const log = (...args) => console.error("[scrape-x]", ...args);

await fs.mkdir(PROFILE_DIR, { recursive: true });
await fs.mkdir(IMG_DIR, { recursive: true });

log(`launching browser… profile=${PROFILE_DIR}`);
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

log(`navigating to ${TIMELINE_URL}`);
await page.goto(TIMELINE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

// Detect login wall
const onLogin = async () => {
  const url = page.url();
  if (url.includes("/i/flow/login") || url.endsWith("/login")) return true;
  const title = (await page.title()).toLowerCase();
  return title.includes("log in") || title.includes("sign in");
};

if (await onLogin()) {
  log("LOGIN REQUIRED — log in to X in the browser window. The script will auto-resume once your timeline loads.");
  await page.waitForFunction(
    (h) => location.pathname.toLowerCase() === `/${h.toLowerCase()}` ||
           location.pathname.toLowerCase().startsWith(`/${h.toLowerCase()}/`),
    HANDLE,
    { timeout: 0 },
  );
  log("login completed");
}

// Wait for the timeline tweet articles
await page.waitForSelector('article[data-testid="tweet"]', { timeout: 60_000 });

// Scroll loop — collect tweets as they appear
const seen = new Map(); // id -> tweet object

const extractTweets = async () =>
  page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    const out = [];
    for (const a of articles) {
      const linkEl = a.querySelector('a[href*="/status/"]');
      const href = linkEl?.getAttribute("href") || "";
      const idMatch = href.match(/\/status\/(\d+)/);
      if (!idMatch) continue;
      const id = idMatch[1];
      const url = `https://x.com${href.split("?")[0]}`;
      const time = a.querySelector("time");
      const createdAt = time?.getAttribute("datetime") || null;

      // Tweet text (lang attr filters out the username header div)
      const textEl = a.querySelector('div[data-testid="tweetText"]');
      const text = textEl ? textEl.innerText.replace(/ /g, " ").trim() : "";
      const lang = textEl?.getAttribute("lang") || null;

      // Images: photos only, filter out avatars/emojis
      const photoLinks = Array.from(a.querySelectorAll('div[data-testid="tweetPhoto"] img'));
      const images = photoLinks
        .map((img) => img.getAttribute("src"))
        .filter(Boolean)
        // upgrade resolution if media URL has format param
        .map((src) => src.replace(/&name=[a-z0-9]+/, "&name=large"));

      const videos = Array.from(a.querySelectorAll("video"))
        .map((v) => v.getAttribute("poster") || v.getAttribute("src"))
        .filter(Boolean);

      // Stats from aria-labels
      const statBtns = Array.from(a.querySelectorAll("[role='group'] [aria-label]"));
      const stats = {};
      for (const b of statBtns) {
        const label = b.getAttribute("aria-label") || "";
        const m = label.match(/(\d[\d,.KkMm]*)\s+(repl|repost|like|bookmark|view)/);
        if (!m) continue;
        const key = m[2].toLowerCase().startsWith("repl") ? "replies"
                  : m[2].toLowerCase().startsWith("repost") ? "reposts"
                  : m[2].toLowerCase().startsWith("like") ? "likes"
                  : m[2].toLowerCase().startsWith("bookmark") ? "bookmarks"
                  : "views";
        stats[key] = m[1];
      }

      out.push({ id, url, text, createdAt, lang, images, videos, stats });
    }
    return out;
  });

let prevCount = 0;
let stagnation = 0;
for (let i = 0; i < MAX_SCROLLS; i++) {
  const batch = await extractTweets();
  for (const t of batch) {
    if (!seen.has(t.id)) seen.set(t.id, t);
  }
  log(`scroll ${i + 1}/${MAX_SCROLLS} — collected ${seen.size} unique tweets`);
  if (seen.size === prevCount) {
    stagnation++;
    if (stagnation >= 4) {
      log("no new tweets in 4 scrolls — stopping");
      break;
    }
  } else {
    stagnation = 0;
  }
  prevCount = seen.size;
  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
  await page.waitForTimeout(SCROLL_PAUSE_MS);
}

// Profile metadata (bio, joined, etc.)
const meta = await page.evaluate(() => {
  const bio = document.querySelector('div[data-testid="UserDescription"]')?.innerText || null;
  const name = document.querySelector('div[data-testid="UserName"] span')?.innerText || null;
  const joined = document.querySelector('span[data-testid="UserJoinDate"]')?.innerText || null;
  const location = document.querySelector('span[data-testid="UserLocation"]')?.innerText || null;
  const link = document.querySelector('a[data-testid="UserUrl"]')?.getAttribute("href") || null;
  return { bio, name, joined, location, link };
});

const tweets = Array.from(seen.values()).sort((a, b) =>
  (b.createdAt || "").localeCompare(a.createdAt || ""),
);

// Download images sequentially
const download = (url, dest) =>
  new Promise((resolve, reject) => {
    const file = fs.open(dest, "w");
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", async () => {
          await fs.writeFile(dest, Buffer.concat(chunks));
          resolve();
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });

log("downloading images…");
for (const t of tweets) {
  for (let i = 0; i < t.images.length; i++) {
    const src = t.images[i];
    const ext = (src.match(/format=(\w+)/) || [, "jpg"])[1].replace("jpeg", "jpg");
    const localPath = path.join(IMG_DIR, `${t.id}__${i}.${ext}`);
    try {
      await download(src, localPath);
      t.images[i] = { src, localPath: path.relative(path.join(__dirname, ".."), localPath) };
    } catch (e) {
      log(`image fail ${t.id}#${i}: ${e.message}`);
      t.images[i] = { src, localPath: null };
    }
  }
}

const result = {
  handle: HANDLE,
  scrapedAt: new Date().toISOString(),
  profile: meta,
  count: tweets.length,
  tweets,
};

await ctx.close();

// Final JSON to stdout
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
log(`done — ${tweets.length} tweets`);
