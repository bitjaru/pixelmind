/**
 * End-to-end refine loop validation.
 *
 * generate callback shells out to Codex CLI for code rewriting. Loops
 * render → see → critique → generate until score ≥ threshold. Saves
 * every iteration as iter-N.png + iter-N.json + iter-N.tsx so the
 * before→after journey is a viral asset (README hero, demo video).
 */
import { writeFileSync, existsSync } from "node:fs";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { spawn } from "node:child_process";
import { evaluate, render, closeBrowser } from "../packages/sdk/dist/index.js";

if (!existsSync(join(homedir(), ".codex", "auth.json"))) {
  console.error("Codex CLI not logged in. Run: npx --yes -p @openai/codex codex login");
  process.exit(2);
}

/** Shell out to `codex exec` for plain text completion. */
async function codexComplete(prompt, timeoutMs = 180_000) {
  const tmp = await mkdtemp(join(tmpdir(), "pixelmind-gen-"));
  const outPath = join(tmp, "out.txt");
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(
        "npx",
        [
          "--yes", "-p", "@openai/codex", "codex", "exec",
          "--skip-git-repo-check",
          "--ephemeral",
          "--sandbox", "read-only",
          "--output-last-message", outPath,
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`codex timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      proc.on("error", (err) => { clearTimeout(timer); reject(err); });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`codex exited ${code}: ${stderr.slice(-400)}`));
      });
      proc.stdin.write(prompt);
      proc.stdin.end();
    });
    return (await readFile(outPath, "utf-8")).trim();
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/** Strip markdown code fences a model might wrap output in. */
function stripFences(text) {
  const m = text.match(/^```(?:tsx|jsx|html|typescript|javascript)?\s*\n([\s\S]*?)\n```\s*$/);
  return (m ? m[1] : text).trim();
}

function buildGenPrompt(currentCode, fixPrompt) {
  return `You are rewriting a React/JSX component to address specific visual issues.

RULES:
- Return ONLY the JSX expression. The first character of your response must be \`<\` and the last must be \`>\`.
- No markdown fences. No commentary. No imports. No function wrapper.
- Keep using Tailwind CSS classes. Do not introduce new dependencies.
- Preserve the listed strengths.

Current code:
${currentCode}

${fixPrompt}`;
}

const INITIAL = `<div className="min-h-screen bg-slate-50 p-8">
  <div className="mx-auto max-w-2xl space-y-6">
    <h1 className="text-3xl font-bold text-slate-900">Today's Revenue</h1>
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Revenue</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">$48.2K</div>
        <div className="mt-1 text-sm font-semibold text-emerald-600">+8.2%</div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Expenses</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">$22.1K</div>
        <div className="mt-1 text-sm font-semibold text-red-600">-2.4%</div>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Profit</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">$26.1K</div>
        <div className="mt-1 text-sm font-semibold text-emerald-600">+12.4%</div>
      </div>
    </div>
  </div>
</div>`;

const INTENT = "fintech dashboard, three KPI cards, trustworthy tone";
const THRESHOLD = 85;
const MAX_ITERS = 3;

const history = [];
let code = INITIAL;

console.log(`→ refine loop — threshold ${THRESHOLD}, max ${MAX_ITERS} iters\n`);

for (let i = 0; i < MAX_ITERS; i++) {
  const label = `iter-${i}`;
  console.log(`[${label}] evaluating…`);
  const t0 = Date.now();
  const { render: r, verdict, fixPrompt } = await evaluate({
    code, intent: INTENT, viewport: "desktop",
  });
  const evalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[${label}] score ${verdict.overallScore}/100  (${verdict.issues.length} issues, ${evalSec}s)`);

  writeFileSync(`scripts/${label}.png`, r.png);
  writeFileSync(`scripts/${label}.tsx`, code);
  writeFileSync(`scripts/${label}.json`, JSON.stringify(verdict, null, 2));
  history.push({ iter: i, score: verdict.overallScore, issueCount: verdict.issues.length });

  if (verdict.overallScore >= THRESHOLD) {
    console.log(`✓ converged at iter ${i}\n`);
    break;
  }
  if (i === MAX_ITERS - 1) {
    console.log(`✗ did not converge in ${MAX_ITERS} iters\n`);
    break;
  }

  console.log(`[${label}] regenerating with codex…`);
  const t1 = Date.now();
  const raw = await codexComplete(buildGenPrompt(code, fixPrompt));
  code = stripFences(raw);
  const genSec = ((Date.now() - t1) / 1000).toFixed(1);
  console.log(`[${label}] new code ${code.length}B (${genSec}s)\n`);
}

console.log("=== summary ===");
for (const h of history) {
  const bar = "█".repeat(Math.round(h.score / 5));
  console.log(`  iter ${h.iter}: ${String(h.score).padStart(3)}/100  ${bar}  (${h.issueCount} issues)`);
}
const delta = history[history.length - 1].score - history[0].score;
console.log(`  Δ ${delta >= 0 ? "+" : ""}${delta} pts across ${history.length} iter(s)`);

writeFileSync(
  "scripts/refine-summary.json",
  JSON.stringify({ history, threshold: THRESHOLD, maxIters: MAX_ITERS }, null, 2),
);
console.log("\n✓ wrote scripts/iter-{0,1,…}.{png,tsx,json} + refine-summary.json");

await closeBrowser();
