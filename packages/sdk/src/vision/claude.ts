import Anthropic from "@anthropic-ai/sdk";
import type { SeeInput, Verdict } from "../types.js";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseVerdict,
  toBase64,
  verdictSchema,
} from "./shared.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Anthropic Claude vision adapter using tool_choice for forced
 * structured output. The schema mirrors {@link verdictSchema}.
 *
 * Reads ANTHROPIC_API_KEY (and optional ANTHROPIC_MODEL) from env at
 * call time. Override the model per-call via input.model.
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

  const model = input.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "report_verdict",
        description:
          "Report the structured visual quality verdict for the rendered UI. You MUST call this tool exactly once.",
        input_schema: verdictSchema() as unknown as Anthropic.Tool.InputSchema,
      },
    ],
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
          { type: "text", text: buildUserPrompt(input.intent) },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === "report_verdict",
  );
  if (!toolUse) {
    throw new Error(
      `Claude did not call report_verdict. stop_reason=${response.stop_reason}`,
    );
  }

  return parseVerdict(toolUse.input, model);
}
