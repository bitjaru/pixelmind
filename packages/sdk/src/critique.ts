import type { Verdict } from "./types.js";

/**
 * Turn a verdict into an LLM-friendly fix prompt.
 *
 * Synchronous because it's pure transformation. Sorts issues by severity,
 * groups by category, frames each as an actionable instruction.
 */
export function critique(verdict: Verdict): string {
  if (verdict.issues.length === 0) {
    return "The current design scored well across all categories. No changes needed.";
  }

  const order: Record<string, number> = { high: 0, med: 1, low: 2 };
  const sorted = [...verdict.issues].sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
  );

  const lines: string[] = [
    `The rendered output scored ${verdict.overallScore}/100. Address these visual issues in the code:`,
    "",
  ];
  sorted.forEach((issue, i) => {
    lines.push(`${i + 1}. [${issue.type}, ${issue.severity}] ${issue.desc}`);
    lines.push(`   Fix: ${issue.suggestion}`);
  });
  if (verdict.strengths.length > 0) {
    lines.push("");
    lines.push(`Keep these strengths: ${verdict.strengths.join("; ")}.`);
  }
  return lines.join("\n");
}
