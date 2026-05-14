/**
 * Score a single piece of generated code without looping.
 *
 * Useful for one-shot inspection, CI checks, or feeding the fix prompt
 * to a human reviewer instead of an LLM.
 */
import { evaluate } from "@pixelmind/sdk";

const code = `
<div class="p-4 grid grid-cols-3 gap-2">
  <h1>Revenue</h1>
  <h1>Expenses</h1>
  <h1>Profit</h1>
</div>
`;

const { verdict, fixPrompt } = await evaluate({
  code,
  intent: "fintech dashboard, three KPI cards",
  viewport: "desktop",
});

console.log(`Score: ${verdict.overallScore}/100`);
for (const issue of verdict.issues) {
  console.log(`  [${issue.severity}] ${issue.type}: ${issue.desc}`);
}
console.log("\nFix prompt:");
console.log(fixPrompt);
