/**
 * Compose iter-0.png + iter-2.png into a side-by-side hero image
 * with score badges and headline. Written for README + social cards.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";

for (const f of ["scripts/iter-0.png", "scripts/iter-2.png"]) {
  if (!existsSync(f)) {
    console.error(`missing ${f} — run scripts/smoke-refine.mjs first`);
    process.exit(2);
  }
}

const iter0 = readFileSync("scripts/iter-0.png").toString("base64");
const iter2 = readFileSync("scripts/iter-2.png").toString("base64");

const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      width: 1600px;
      height: 1000px;
      padding: 64px;
      color: #fff;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }
    .logo {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800;
      font-size: 22px;
    }
    .brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .tagline {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
      margin-bottom: 12px;
    }
    .sub {
      color: #a1a1aa;
      font-size: 16px;
      margin-bottom: 32px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 60px 1fr;
      gap: 24px;
      align-items: center;
    }
    .panel {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 30px 60px rgba(0,0,0,0.4);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #27272a;
      background: #09090b;
    }
    .panel-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #71717a;
    }
    .panel-score {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .score-before { color: #fbbf24; }
    .score-after { color: #22c55e; }
    .panel img {
      display: block;
      width: 100%;
      height: 460px;
      object-fit: cover;
      object-position: top;
    }
    .arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #a855f7;
    }
    .arrow-icon {
      font-size: 40px;
      line-height: 1;
    }
    .arrow-text {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #a1a1aa;
      writing-mode: vertical-rl;
      transform: rotate(180deg);
    }
    .delta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 28px;
      padding: 10px 16px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: #4ade80;
    }
    .delta-dot {
      width: 6px; height: 6px;
      background: #22c55e;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">P</div>
    <div class="brand">Pixelmind</div>
  </div>
  <div class="tagline">Your LLM is blind to what it creates.<br>We give it eyes.</div>
  <div class="sub">Same starting prompt. Pixelmind judged the render, fed concrete feedback back to the LLM, and re-rendered — twice.</div>
  <div class="grid">
    <div class="panel">
      <div class="panel-header">
        <div class="panel-label">Before · iter 0</div>
        <div class="panel-score score-before">79 / 100</div>
      </div>
      <img src="data:image/png;base64,${iter0}" alt="iter-0" />
    </div>
    <div class="arrow">
      <div class="arrow-icon">→</div>
      <div class="arrow-text">3 iters · 0$ via Codex CLI</div>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div class="panel-label">After · iter 2</div>
        <div class="panel-score score-after">85 / 100</div>
      </div>
      <img src="data:image/png;base64,${iter2}" alt="iter-2" />
    </div>
  </div>
  <div class="delta">
    <div class="delta-dot"></div>
    converged at threshold 85 · +6 points · 9 issues → 7 issues
  </div>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 1000 });
await page.setContent(html);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);
const png = await page.screenshot({ type: "png", fullPage: false });
writeFileSync("assets/hero.png", png);
await browser.close();

console.log(`✓ assets/hero.png (${(png.length / 1024).toFixed(1)}KB)`);
