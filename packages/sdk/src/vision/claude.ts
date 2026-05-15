import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_RUBRIC } from "../rubrics/default.js";
import { intentToString } from "../intent.js";
import type { Category, Issue, SeeInput, Severity, Verdict } from "../types.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const CATEGORIES = DEFAULT_RUBRIC.map((c) => c.name);

const SYSTEM_PROMPT = `You are a senior product designer evaluating an AI-generated UI against the user's stated intent.

You will be shown a screenshot and a one-line description of what was wanted. Your job is to score the design across 9 categories (0-100 each), surface concrete issues with imperative fixes, and acknowledge strengths the LLM should preserve on a rewrite.

Calibration anchors:
- 90-100: ship-quality. Could appear in a polished product without edits.
- 75-89: solid but with addressable issues. Most LLM-generated UIs land here after one or two refinement passes.
- 60-74: identifiable design choices but clear quality gaps.
- 40-59: visibly amateur, multiple issues.
- 0-39: broken layout, severely off-brand, or unusable.

Be specific. "Spacing inconsistent" is too vague — say what is too tight or too loose, and what unit to use instead. Always pair an issue with a concrete suggestion the LLM can act on.

Output exactly one report_verdict tool call. No prose.`;

function buildUserPrompt(intent: string, rubricLines: string): string {
  return `Intent: ${intent}

Evaluate the screenshot against these 9 categories:

${rubricLines}

For each category, return a 0-100 score in the \`scores\` object. Then list issues (with severity + concrete suggestion) and strengths in the report_verdict tool call.`;
}

function buildRubricLines(): string {
  return DEFAULT_RUBRIC.map(
    (c, i) =>
      `${i + 1}. ${c.name} (weight ${(c.weight * 100).toFixed(0)}%): ${c.prompt}`,
  ).join("\n");
}

function categoryEnum() {
  return CATEGORIES as readonly Category[];
}

function reportVerdictTool() {
  return {
    name: "report_verdict",
    description:
      "Report the structured visual quality verdict for the rendered UI. You MUST call this tool exactly once.",
    input_schema: {
      type: "object" as const,
      properties: {
        overallScore: {
          type: "number" as const,
          description: "0-100 weighted average across the 9 categories.",
        },
        scores: {
          type: "object" as const,
          description: "Per-category score 0-100. Include every category.",
          properties: Object.fromEntries(
            categoryEnum().map((c) => [c, { type: "number" as const }]),
          ),
          required: [...categoryEnum()],
        },
        issues: {
          type: "array" as const,
          description: "Specific issues, sorted by severity. Each has an actionable suggestion.",
          items: {
            type: "object" as const,
            properties: {
              type: { type: "string" as const, enum: [...categoryEnum()] },
              severity: { type: "string" as const, enum: ["low", "med", "high"] },
              desc: { type: "string" as const, description: "What is wrong, specifically." },
              suggestion: {
                type: "string" as const,
                description: "Imperative fix the LLM can act on. Prefer concrete values.",
              },
            },
            required: ["type", "severity", "desc", "suggestion"],
          },
        },
        strengths: {
          type: "array" as const,
          description: "What the LLM should preserve on a rewrite.",
          items: { type: "string" as const },
        },
      },
      required: ["overallScore", "scores", "issues", "strengths"],
    },
  };
}

function toBase64(screenshot: Buffer | string): string {
  if (typeof screenshot === "string") {
    // Already base64 or a data URL
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

function parseVerdict(rawInput: unknown, model: string): Verdict {
  if (typeof rawInput !== "object" || rawInput === null) {
    throw new Error("report_verdict returned non-object");
  }
  const raw = rawInput as Record<string, unknown>;

  const overall = typeof raw.overallScore === "number" ? raw.overallScore : NaN;
  if (Number.isNaN(overall)) throw new Error("report_verdict missing overallScore");

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

/**
 * Anthropic Claude vision adapter.
 *
 * Sends the screenshot + intent + 9-category rubric to Claude with a
 * tool-forced output so the response is always valid structured JSON.
 * The rubric prompts are grounded in StyleSeed's design rules.
 *
 * Reads `ANTHROPIC_API_KEY` from env at call time (not import time, so
 * the package can be imported without credentials).
 */
export async function judgeWithClaude(
  input: SeeInput & { model?: string },
): Promise<Verdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Pixelmind's see() needs an Anthropic API key to call Claude vision.",
    );
  }

  const model = input.model ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  const intent = intentToString(input.intent);
  const userPrompt = buildUserPrompt(intent, buildRubricLines());
  const tool = reportVerdictTool();

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: "report_verdict" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: toBase64(input.screenshot),
            },
          },
          { type: "text", text: userPrompt },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "report_verdict",
  );
  if (!toolUse) {
    throw new Error(
      `Claude did not call report_verdict. stop_reason=${response.stop_reason}`,
    );
  }

  return parseVerdict(toolUse.input, model);
}
