import type { SeeInput, Verdict } from "./types.js";

/**
 * Judge a screenshot against an intent across 9 categories.
 *
 * V1 stub: real implementation calls Claude Sonnet 4.6 with a structured
 * vision prompt that scores hierarchy, spacing, typography, color,
 * alignment, density, consistency, accessibility, and brand-fit. The
 * rubric is grounded in StyleSeed's 69 design rules (DESIGN-LANGUAGE.md).
 */
export async function see(input: SeeInput): Promise<Verdict> {
  // TODO: load rubric, build vision-LLM prompt with screenshot + intent,
  // call Claude vision API, parse structured JSON response, validate
  throw new Error("see() not yet implemented — V1 Phase 3");
}
