#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluate } from "@pixelmind/sdk";

const HELP = `pixelmind — render-aware feedback for LLM-generated UI

Usage:
  pixelmind fix <file> --intent "<description>"   Score and print fix prompt
  pixelmind score <file> --intent "<description>" Score only, no fix prompt
  pixelmind --help                                Show this help

Aliases: pm

Options:
  --intent     What you wanted the UI to be (required)
  --viewport   desktop|mobile|tablet (default: desktop)
  --skin       toss|stripe|linear|... (optional)
  --out        Path to write the verdict JSON (default: stdout)
`;

type Args = {
  command?: string;
  file?: string;
  intent?: string;
  viewport?: string;
  skin?: string;
  out?: string;
  help?: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--intent") out.intent = argv[++i];
    else if (a === "--viewport") out.viewport = argv[++i];
    else if (a === "--skin") out.skin = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else rest.push(a);
  }
  out.command = rest[0];
  out.file = rest[1];
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    console.log(HELP);
    process.exit(args.help ? 0 : 1);
  }

  if (args.command !== "fix" && args.command !== "score") {
    console.error(`Unknown command: ${args.command}\n\n${HELP}`);
    process.exit(1);
  }

  if (!args.file) {
    console.error("Missing file argument.\n\n" + HELP);
    process.exit(1);
  }
  if (!args.intent) {
    console.error("Missing --intent.\n\n" + HELP);
    process.exit(1);
  }

  const code = await readFile(resolve(args.file), "utf-8");
  const result = await evaluate({
    code,
    intent: args.intent,
    viewport: args.viewport as "desktop" | "mobile" | "tablet" | undefined,
    skin: args.skin,
  });

  const payload = {
    file: args.file,
    score: result.verdict.overallScore,
    scores: result.verdict.scores,
    issues: result.verdict.issues,
    strengths: result.verdict.strengths,
    ...(args.command === "fix" ? { fixPrompt: result.fixPrompt } : {}),
  };

  if (args.out) {
    await writeFile(args.out, JSON.stringify(payload, null, 2));
    console.log(`Wrote ${args.out}`);
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
