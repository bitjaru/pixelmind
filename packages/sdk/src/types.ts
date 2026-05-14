/**
 * Pixelmind core types.
 *
 * Shape of every public function's input/output. Stable across V1.
 */

/** What the user wanted. Either free-form string or structured. */
export type Intent =
  | string
  | {
      domain?: string;
      tone?: string;
      surface?: string;
      target?: "desktop" | "mobile" | "tablet";
      brand?: string;
    };

/** A viewport spec. Either preset or explicit. */
export type Viewport =
  | "desktop"
  | "mobile"
  | "tablet"
  | { width: number; height: number; dpr?: number };

/** Brand skin context (StyleSeed-compatible). */
export type Skin = string;

export type RenderInput = {
  /** TSX, JSX, or full HTML string. SDK auto-detects. */
  code: string;
  viewport?: Viewport;
  skin?: Skin;
  /** Wait for fonts/animations to settle before screenshot. ms. */
  settleMs?: number;
};

export type RenderResult = {
  png: Buffer;
  html: string;
  css: string;
  /** Browser console errors during render. */
  errors: string[];
  meta: {
    viewportWidth: number;
    viewportHeight: number;
    renderedAt: string;
  };
};

export type Severity = "low" | "med" | "high";

export type Category =
  | "hierarchy"
  | "spacing"
  | "typography"
  | "color"
  | "alignment"
  | "density"
  | "consistency"
  | "accessibility"
  | "brand-fit";

export type Issue = {
  type: Category;
  severity: Severity;
  desc: string;
  /** What the LLM should change. Imperative voice. */
  suggestion: string;
  /** Optional bbox in screenshot coordinates. */
  location?: { x: number; y: number; w: number; h: number };
};

export type Verdict = {
  /** 0–100. Weighted across categories. */
  overallScore: number;
  /** Per-category 0–100. */
  scores: Record<Category, number>;
  issues: Issue[];
  /** What's already good. Encourages keeping these. */
  strengths: string[];
  meta: {
    model: string;
    rubric: string;
    judgedAt: string;
  };
};

export type SeeInput = {
  screenshot: Buffer | string;
  intent: Intent;
  /** Built-in or custom rubric name. */
  rubric?: "default" | string;
};

export type EvaluateInput = {
  code: string;
  intent: Intent;
  viewport?: Viewport;
  skin?: Skin;
  rubric?: "default" | string;
};

export type EvaluateResult = {
  render: RenderResult;
  verdict: Verdict;
  fixPrompt: string;
};

export type RefineInput = {
  initialCode: string;
  intent: Intent;
  viewport?: Viewport;
  skin?: Skin;
  /** Stop when overall score ≥ this. Default 80. */
  threshold?: number;
  /** Max attempts. Default 5. */
  maxIters?: number;
  /** User-supplied LLM call. Gets (currentCode, fixPrompt) → newCode. */
  generate: (currentCode: string, fixPrompt: string) => Promise<string>;
};

export type RefineResult = {
  finalCode: string;
  finalScore: number;
  iterations: number;
  history: Array<{ score: number; issueCount: number }>;
  converged: boolean;
};
