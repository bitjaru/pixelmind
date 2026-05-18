import { DEFAULT_RUBRIC } from "../rubrics/default.js";
import { intentToString } from "../intent.js";
import type { Category, Intent, Issue, Severity, Verdict } from "../types.js";

const CATEGORIES = DEFAULT_RUBRIC.map((c) => c.name);

export const SYSTEM_PROMPT = `You are a senior product designer evaluating an AI-generated UI against the user's stated intent.

You will be shown a screenshot and a one-line description of what was wanted. Your job is to score the design across 9 categories (0-100 each), surface concrete issues with imperative fixes, and acknowledge strengths the LLM should preserve on a rewrite.

Calibration anchors:
- 90-100: ship-quality. Could appear in a polished product without edits.
- 75-89: solid but with addressable issues. Most LLM-generated UIs land here after one or two refinement passes.
- 60-74: identifiable design choices but clear quality gaps.
- 40-59: visibly amateur, multiple issues.
- 0-39: broken layout, severely off-brand, or unusable.

Be specific. "Spacing inconsistent" is too vague — say what is too tight or too loose, and what unit to use instead. Always pair an issue with a concrete suggestion the LLM can act on.

Return your verdict in the exact structured format requested. No prose outside the structured output.`;

export function buildRubricLines(): string {
  return DEFAULT_RUBRIC.map(
    (c, i) =>
      `${i + 1}. ${c.name} (weight ${(c.weight * 100).toFixed(0)}%): ${c.prompt}`,
  ).join("\n");
}

export function buildUserPrompt(intent: Intent): string {
  return `Intent: ${intentToString(intent)}

Evaluate the screenshot against these 9 categories:

${buildRubricLines()}

For each category, return a 0-100 score in the \`scores\` object. Then list issues (with severity + concrete suggestion) and strengths.`;
}

/**
 * Provider-agnostic verdict schema. Used as Anthropic tool input_schema
 * and as OpenAI Structured Outputs json_schema. Strict mode compatible:
 * every property is required, additionalProperties: false, no defaults.
 */
export function verdictSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      overallScore: {
        type: "number",
        description: "0-100 weighted average across the 9 categories.",
      },
      scores: {
        type: "object",
        additionalProperties: false,
        description: "Per-category score 0-100.",
        properties: Object.fromEntries(
          CATEGORIES.map((c) => [c, { type: "number" }]),
        ),
        required: [...CATEGORIES],
      },
      issues: {
        type: "array",
        description: "Specific issues, sorted by severity. Each carries an actionable suggestion.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: { type: "string", enum: [...CATEGORIES] },
            severity: { type: "string", enum: ["low", "med", "high"] },
            desc: { type: "string", description: "What is wrong, specifically." },
            suggestion: {
              type: "string",
              description: "Imperative fix the LLM can act on. Prefer concrete values.",
            },
          },
          required: ["type", "severity", "desc", "suggestion"],
        },
      },
      strengths: {
        type: "array",
        description: "What the LLM should preserve on a rewrite.",
        items: { type: "string" },
      },
    },
    required: ["overallScore", "scores", "issues", "strengths"],
  };
}

export function toBase64(screenshot: Buffer | string): string {
  if (typeof screenshot === "string") {
    if (screenshot.startsWith("data:")) return screenshot.split(",")[1] ?? "";
    return screenshot;
  }
  return screenshot.toString("base64");
}

function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

function isSeverity(v: unknown): v is Severity {
  return v === "low" || v === "med" || v === "high";
}

/**
 * Defensive parser. Drops malformed entries, defaults missing scores to
 * 0, clamps overall to [0, 100]. Provider-agnostic.
 */
export function parseVerdict(rawInput: unknown, model: string): Verdict {
  if (typeof rawInput !== "object" || rawInput === null) {
    throw new Error("verdict response was not an object");
  }
  const raw = rawInput as Record<string, unknown>;

  const overall = typeof raw.overallScore === "number" ? raw.overallScore : NaN;
  if (Number.isNaN(overall)) throw new Error("verdict missing overallScore");

  const scoresInput = (raw.scores ?? {}) as Record<string, unknown>;
  const scores = {} as Record<Category, number>;
  for (const c of CATEGORIES) {
    const v = scoresInput[c];
    scores[c] = typeof v === "number" ? v : 0;
  }

  const issuesInput = Array.isArray(raw.issues) ? raw.issues : [];
  const issues: Issue[] = [];
  for (const item of issuesInput) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (!isCategory(obj.type) || !isSeverity(obj.severity)) continue;
    if (typeof obj.desc !== "string" || typeof obj.suggestion !== "string") continue;
    issues.push({
      type: obj.type,
      severity: obj.severity,
      desc: obj.desc,
      suggestion: obj.suggestion,
    });
  }

  const strengthsInput = Array.isArray(raw.strengths) ? raw.strengths : [];
  const strengths: string[] = strengthsInput.filter((s): s is string => typeof s === "string");

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(overall))),
    scores,
    issues,
    strengths,
    meta: {
      model,
      rubric: "default",
      judgedAt: new Date().toISOString(),
    },
  };
}
