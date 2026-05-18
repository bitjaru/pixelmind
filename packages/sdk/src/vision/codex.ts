import { spawn } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseVerdict,
  verdictSchema,
} from "./shared.js";
import type { SeeInput, Verdict } from "../types.js";

const DEFAULT_TIMEOUT_MS = 180_000;

/** True if `~/.codex/auth.json` exists — Codex CLI is logged in. */
export function codexCliAvailable(): boolean {
  return existsSync(join(homedir(), ".codex", "auth.json"));
}

type CodexOptions = SeeInput & {
  model?: string;
  /** Path to `codex` binary or `npx`-style invocation. Defaults to `npx -y -p @openai/codex codex`. */
  command?: string[];
  /** Timeout in ms. Default 120s. */
  timeoutMs?: number;
};

/**
 * Codex CLI vision adapter.
 *
 * Shells out to `codex exec` so the call rides on the user's Codex CLI
 * subscription auth (`~/.codex/auth.json`) instead of an API key with
 * separate billing. Uses `--output-schema` to force the agent's final
 * message into our verdict shape and `--output-last-message` to read
 * back exactly that message without log noise.
 *
 * Sandbox is forced to read-only so the agent cannot mutate user files
 * while it's "evaluating" the screenshot.
 */
export async function judgeWithCodex(input: CodexOptions): Promise<Verdict> {
  const model = input.model; // undefined → let codex CLI pick (required for ChatGPT-account auth)
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cmd = input.command ?? ["npx", "--yes", "-p", "@openai/codex", "codex"];

  const tmp = await mkdtemp(join(tmpdir(), "pixelmind-codex-"));
  const imgPath = join(tmp, "screenshot.png");
  const schemaPath = join(tmp, "schema.json");
  const outPath = join(tmp, "verdict.json");

  try {
    const img =
      typeof input.screenshot === "string"
        ? Buffer.from(input.screenshot, "base64")
        : input.screenshot;
    await writeFile(imgPath, img);
    await writeFile(schemaPath, JSON.stringify(verdictSchema(), null, 2));
    const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(input.intent)}`;

    const args = [
      ...cmd.slice(1),
      "exec",
      "--skip-git-repo-check",
      "--ephemeral",
      "--sandbox", "read-only",
      "--output-schema", schemaPath,
      "--output-last-message", outPath,
      "-i", imgPath,
      ...(model ? ["-m", model] : []),
    ];

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(cmd[0]!, args, { stdio: ["pipe", "pipe", "pipe"] });
      let stderr = "";
      let stdoutTail = "";
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.stdout.on("data", (d) => {
        stdoutTail = (stdoutTail + d.toString()).slice(-2000);
      });
      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`codex exec timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
      proc.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `codex exec exited with code ${code}\nstderr: ${stderr.slice(-800)}\nstdout: ${stdoutTail}`,
            ),
          );
      });
      proc.stdin.write(prompt);
      proc.stdin.end();
    });

    const raw = await readFile(outPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parseVerdict(parsed, `codex:${model ?? "default"}`);
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
