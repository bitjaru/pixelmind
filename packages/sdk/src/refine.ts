import { evaluate } from "./evaluate.js";
import type { RefineInput, RefineResult } from "./types.js";

/**
 * Iteratively refine code until it meets a quality threshold.
 *
 * The simplest orchestration primitive on top of evaluate(): generate →
 * score → if low, ask the user-supplied LLM to revise with our critique
 * prompt → score again → repeat. Bails out at `maxIters` if convergence
 * doesn't happen.
 *
 * This function is intentionally a thin helper. Real orchestration loops
 * may want to log, retry, or parallelize — those should be written
 * against the lower-level primitives.
 */
export async function refine(input: RefineInput): Promise<RefineResult> {
  const threshold = input.threshold ?? 80;
  const maxIters = input.maxIters ?? 5;

  let code = input.initialCode;
  const history: RefineResult["history"] = [];

  for (let i = 0; i < maxIters; i++) {
    const { verdict, fixPrompt } = await evaluate({
      code,
      intent: input.intent,
      viewport: input.viewport,
      skin: input.skin,
    });
    history.push({ score: verdict.overallScore, issueCount: verdict.issues.length });
    if (verdict.overallScore >= threshold) {
      return {
        finalCode: code,
        finalScore: verdict.overallScore,
        iterations: i + 1,
        history,
        converged: true,
      };
    }
    code = await input.generate(code, fixPrompt);
  }

  // ran out of iterations — score the last attempt without regenerating
  const final = await evaluate({
    code,
    intent: input.intent,
    viewport: input.viewport,
    skin: input.skin,
  });
  history.push({ score: final.verdict.overallScore, issueCount: final.verdict.issues.length });
  return {
    finalCode: code,
    finalScore: final.verdict.overallScore,
    iterations: maxIters,
    history,
    converged: final.verdict.overallScore >= threshold,
  };
}
