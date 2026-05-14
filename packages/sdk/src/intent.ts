import type { Intent } from "./types.js";

/**
 * Normalize an Intent to a flat string for vision-LLM prompting.
 *
 * Pure utility — doesn't call any external service. The structured form
 * is for callers who want richer typed input; we just stringify it.
 */
export function intentToString(intent: Intent): string {
  if (typeof intent === "string") return intent;
  const parts: string[] = [];
  if (intent.surface) parts.push(intent.surface);
  if (intent.domain) parts.push(`in the ${intent.domain} domain`);
  if (intent.tone) parts.push(`with a ${intent.tone} tone`);
  if (intent.brand) parts.push(`styled like ${intent.brand}`);
  if (intent.target) parts.push(`for ${intent.target}`);
  return parts.join(", ") || "general UI";
}

/**
 * Best-effort extraction of structured intent from a user prompt.
 *
 * V1 stub. Real implementation uses a cheap LLM call to parse the
 * prompt; falls back to the raw string when extraction fails.
 */
export async function extractIntent(prompt: string): Promise<Intent> {
  // TODO: implement with a small Haiku call returning typed JSON
  return prompt;
}
