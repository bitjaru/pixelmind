import { writeFileSync } from "node:fs";
import { render, closeBrowser } from "../packages/sdk/dist/index.js";

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

console.log("Rendering sample JSX...");
const result = await render({
  code: SAMPLE_JSX,
  viewport: "desktop",
  settleMs: 1500, // give Tailwind CDN extra time
});

console.log(`✓ rendered ${result.meta.viewportWidth}×${result.meta.viewportHeight}`);
console.log(`✓ png ${(result.png.length / 1024).toFixed(1)}KB`);
console.log(`✓ console errors: ${result.errors.length}`);
if (result.errors.length > 0) console.log("  →", result.errors.slice(0, 3));

writeFileSync("scripts/smoke-render.png", result.png);
console.log("✓ wrote scripts/smoke-render.png");

await closeBrowser();
