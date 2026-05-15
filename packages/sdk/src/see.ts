import { judgeWithClaude } from "./vision/claude.js";
import type { SeeInput, Verdict } from "./types.js";

/**
 * Judge a screenshot against an intent across the 9 default categories.
 *
 * V1 delegates to Claude Sonnet 4.6 vision via {@link judgeWithClaude}.
 * Future versions will support ensembling multiple vision models for
 * better calibration (V2) and pluggable rubrics (V2.5).
 */
export async function see(input: SeeInput): Promise<Verdict> {
  if (input.rubric && input.rubric !== "default") {
    throw new Error(
      `Custom rubrics are not yet supported. Got "${input.rubric}". Use "default" or omit.`,
    );
  }
  return judgeWithClaude(input);
}
