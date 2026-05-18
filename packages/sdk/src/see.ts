import { judgeWithClaude } from "./vision/claude.js";
import { judgeWithOpenAI } from "./vision/openai.js";
import { judgeWithCodex, codexCliAvailable } from "./vision/codex.js";
import type { SeeInput, Verdict } from "./types.js";

export type Provider = "codex" | "openai" | "claude" | "auto";

export type SeeOptions = SeeInput & {
  /**
   * Which vision backend to use.
   * - "auto" (default): prefer Codex CLI (subscription auth, no API
   *   billing), then OPENAI_API_KEY, then ANTHROPIC_API_KEY.
   * - "codex": shell out to `codex exec`. Uses ~/.codex/auth.json.
   * - "openai": GPT-4o vision via OPENAI_API_KEY.
   * - "claude": Sonnet 4.6 vision via ANTHROPIC_API_KEY.
   */
  provider?: Provider;
  /** Override the provider's default model. */
  model?: string;
};

function autoProvider(): Provider {
  if (codexCliAvailable()) return "codex";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  throw new Error(
    "see(): no vision backend available. Install Codex CLI (and `codex login`), or set OPENAI_API_KEY / ANTHROPIC_API_KEY, or pass provider explicitly.",
  );
}

/**
 * Judge a screenshot against an intent across the 9 default categories.
 *
 * Dispatches to Codex CLI, OpenAI (GPT-4o, Structured Outputs), or
 * Claude (Sonnet 4.6, tool_choice). Same verdict shape from any side.
 */
export async function see(input: SeeOptions): Promise<Verdict> {
  if (input.rubric && input.rubric !== "default") {
    throw new Error(
      `Custom rubrics are not yet supported. Got "${input.rubric}". Use "default" or omit.`,
    );
  }
  const provider =
    input.provider && input.provider !== "auto" ? input.provider : autoProvider();

  if (provider === "codex") return judgeWithCodex(input);
  if (provider === "openai") return judgeWithOpenAI(input);
  if (provider === "claude") return judgeWithClaude(input);
  throw new Error(`Unknown provider: ${provider}`);
}
