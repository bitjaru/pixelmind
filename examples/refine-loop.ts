/**
 * Refine until the score crosses a threshold.
 *
 * This is the "design ralph" pattern — generate → judge → fix → loop.
 * Shows how to plug Pixelmind into any LLM you already use.
 */
import { refine } from "@pixelmind/sdk";

declare const myLLM: {
  complete(prompt: string): Promise<string>;
};

const initialPrompt = "Build a fintech dashboard with revenue, expenses, and trend charts.";

const initialCode = await myLLM.complete(initialPrompt);

const result = await refine({
  initialCode,
  intent: { domain: "fintech", surface: "dashboard", tone: "trustworthy" },
  threshold: 80,
  maxIters: 5,
  generate: async (currentCode, fixPrompt) => {
    return myLLM.complete(`${currentCode}\n\n${fixPrompt}`);
  },
});

console.log(`Converged: ${result.converged}`);
console.log(`Final score: ${result.finalScore}/100`);
console.log(`Iterations: ${result.iterations}`);
console.log(`Score history: ${result.history.map((h) => h.score).join(" → ")}`);
