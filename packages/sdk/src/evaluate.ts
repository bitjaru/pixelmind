import { render } from "./render.js";
import { see } from "./see.js";
import { critique } from "./critique.js";
import type { EvaluateInput, EvaluateResult } from "./types.js";

/**
 * End-to-end: code → screenshot → verdict → fix prompt.
 *
 * Convenience composition of render() + see() + critique(). Returns the
 * intermediate `render` and `verdict` too so callers can inspect or
 * persist them.
 */
export async function evaluate(input: EvaluateInput): Promise<EvaluateResult> {
  const renderResult = await render({
    code: input.code,
    viewport: input.viewport,
    skin: input.skin,
  });
  const verdict = await see({
    screenshot: renderResult.png,
    intent: input.intent,
    rubric: input.rubric,
  });
  const fixPrompt = critique(verdict);
  return { render: renderResult, verdict, fixPrompt };
}
