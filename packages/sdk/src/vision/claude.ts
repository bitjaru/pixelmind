import type { SeeInput, Verdict } from "../types.js";

/**
 * Anthropic Claude vision adapter.
 *
 * V1 stub: the real implementation builds a structured prompt from the
 * rubric, sends the screenshot + intent to Claude Sonnet 4.6 vision,
 * parses a JSON-schema-constrained response, and returns a Verdict.
 *
 * Reads ANTHROPIC_API_KEY from env. Throws if missing at call time, not
 * import time, so the package can be imported without credentials.
 */
export async function judgeWithClaude(_input: SeeInput): Promise<Verdict> {
  // TODO: import @anthropic-ai/sdk, build messages with image_url + rubric,
  //       request JSON output, validate against zod schema, return Verdict.
  throw new Error("judgeWithClaude() not yet implemented — V1 Phase 3");
}
