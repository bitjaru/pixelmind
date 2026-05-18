import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { evaluate, closeBrowser } from "../packages/sdk/dist/index.js";

const hasCodex = existsSync(join(homedir(), ".codex", "auth.json"));
const provider = hasCodex
  ? "codex"
  : process.env.OPENAI_API_KEY
    ? "openai"
    : process.env.ANTHROPIC_API_KEY
      ? "claude"
      : null;

if (!provider) {
  console.error("No vision backend available.");
  console.error("Install Codex CLI + `codex login`, or set OPENAI_API_KEY / ANTHROPIC_API_KEY.");
  process.exit(2);
}
console.log(`→ provider auto-detect: ${provider}`);

const SAMPLE_JSX = `
<div className="min-h-screen bg-slate-50 p-8">
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
</div>
`;

console.log("→ evaluate() — render + see + critique");
const t0 = Date.now();
const result = await evaluate({
  code: SAMPLE_JSX,
  intent: "fintech dashboard, three KPI cards, trustworthy tone",
  viewport: "desktop",
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n✓ done in ${elapsed}s`);
console.log(`  PNG: ${(result.render.png.length / 1024).toFixed(1)}KB`);
console.log(`  render errors: ${result.render.errors.length}`);
console.log(`  judge model: ${result.verdict.meta.model}`);
console.log(`\n  overall: ${result.verdict.overallScore}/100`);
console.log("  per-category:");
for (const [cat, score] of Object.entries(result.verdict.scores)) {
  const bar = "█".repeat(Math.round(score / 5));
  console.log(`    ${cat.padEnd(14)} ${String(score).padStart(3)}  ${bar}`);
}
console.log(`\n  issues: ${result.verdict.issues.length}`);
for (const issue of result.verdict.issues) {
  console.log(`    [${issue.severity}] ${issue.type}: ${issue.desc}`);
  console.log(`        → ${issue.suggestion}`);
}
console.log(`\n  strengths: ${result.verdict.strengths.length}`);
for (const s of result.verdict.strengths) {
  console.log(`    • ${s}`);
}
console.log("\n--- fix prompt ---");
console.log(result.fixPrompt);

writeFileSync("scripts/smoke-evaluate.png", result.render.png);
writeFileSync("scripts/smoke-evaluate.json", JSON.stringify(result.verdict, null, 2));
console.log("\n✓ wrote scripts/smoke-evaluate.png + .json");

await closeBrowser();
