import OpenAI from "openai";
import type { SeeInput, Verdict } from "../types.js";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseVerdict,
  toBase64,
  verdictSchema,
} from "./shared.js";

const DEFAULT_MODEL = "gpt-4o-2024-08-06";

/**
 * OpenAI vision adapter using Structured Outputs.
 *
 * GPT-4o (and later) supports response_format: json_schema with strict
 * mode — the model output is guaranteed to match the schema or the
 * request fails. Cheaper than tool calling for one-shot JSON.
 *
 * Reads OPENAI_API_KEY (and optional OPENAI_MODEL) from env at call
 * time. Override the model per-call via input.model.
 */
export async function judgeWithOpenAI(
  input: SeeInput & { model?: string },
): Promise<Verdict> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Pixelmind's see() needs an OpenAI API key to call GPT vision.",
    );
  }

  const model = input.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: buildUserPrompt(input.intent) },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${toBase64(input.screenshot)}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "report_verdict",
        strict: true,
        // verdictSchema is typed as Record<string, unknown> — cast to schema shape
        schema: verdictSchema() as unknown as Record<string, unknown>,
      },
    },
  });

  const message = response.choices[0]?.message;
  if (!message?.content) {
    throw new Error(
      `OpenAI returned no content. finish_reason=${response.choices[0]?.finish_reason}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message.content);
  } catch (err) {
    throw new Error(
      `OpenAI returned non-JSON content despite Structured Outputs: ${(err as Error).message}`,
    );
  }

  return parseVerdict(parsed, model);
}
