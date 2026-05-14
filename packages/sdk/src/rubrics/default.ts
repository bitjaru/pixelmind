import type { Category } from "../types.js";

/**
 * The default 9-category rubric.
 *
 * Each category contributes to overallScore by `weight`. Each carries
 * the vision-LLM-facing description (`prompt`) that anchors what the
 * judge model should look for. Prompts are grounded in StyleSeed's
 * production design rules.
 */
export type RubricCategory = {
  name: Category;
  weight: number;
  /** What the vision LLM should evaluate. Surfaces to model verbatim. */
  prompt: string;
  /** Reference rules in StyleSeed/DESIGN-LANGUAGE.md (for traceability). */
  styleSeedRules?: string[];
};

export const DEFAULT_RUBRIC: RubricCategory[] = [
  {
    name: "hierarchy",
    weight: 0.18,
    prompt:
      "Is the visual weight distributed so the most important element clearly dominates? Look for a single hero element, secondary supporting elements, and tertiary details — in descending size, weight, and color emphasis.",
    styleSeedRules: ["rule 14", "rule 18", "rule 19"],
  },
  {
    name: "spacing",
    weight: 0.14,
    prompt:
      "Is spacing consistent and rhythmic? Multiples of a single unit (e.g., 4/6/8/12/24px), `mx-6` for single cards, `px-6` for grids/carousels. Section gaps should feel deliberate.",
    styleSeedRules: ["rule 61", "rule 62", "rule 63"],
  },
  {
    name: "typography",
    weight: 0.14,
    prompt:
      "Are font sizes drawn from a coherent scale, with clear hierarchy (display > heading > body > caption)? Line-height matches size (tight for display, normal for body). No more than 2-3 weights used.",
    styleSeedRules: ["Font Size by Context table"],
  },
  {
    name: "color",
    weight: 0.14,
    prompt:
      "Is exactly one accent color used for emphasis, with everything else in grayscale? No pure black (#000) — darkest text should be ~#2A2A2A. Status colors (success/warning/destructive) used sparingly and only where semantically required.",
    styleSeedRules: ["Golden rule 2", "Golden rule 3"],
  },
  {
    name: "alignment",
    weight: 0.08,
    prompt:
      "Are elements aligned to a consistent grid? Text baselines line up; card edges share vertical/horizontal axes; icons centered on text or icon-grid baseline.",
  },
  {
    name: "density",
    weight: 0.08,
    prompt:
      "Is there enough breathing room without feeling sparse? Touch targets ≥ 44×44px. Cards have generous internal padding. No element feels cramped against its container.",
    styleSeedRules: ["rule 8"],
  },
  {
    name: "consistency",
    weight: 0.08,
    prompt:
      "Are similar things styled similarly? Repeated patterns use the same component shape; spacing units repeat; corner radii are uniform within a surface tier.",
    styleSeedRules: ["rule 6"],
  },
  {
    name: "accessibility",
    weight: 0.08,
    prompt:
      "Does the design meet WCAG AA contrast (4.5:1 for body, 3:1 for large text)? Are focus states visible? Are interactive elements clearly distinguished from static content?",
    styleSeedRules: ["ss-a11y rules"],
  },
  {
    name: "brand-fit",
    weight: 0.08,
    prompt:
      "Does the design match the stated intent's tone, domain, and brand cues? Fintech reads trustworthy and dense-with-data; consumer reads warm and playful; productivity reads calm and structured.",
  },
];

export const DEFAULT_RUBRIC_MAP: Record<Category, RubricCategory> = Object.fromEntries(
  DEFAULT_RUBRIC.map((c) => [c.name, c]),
) as Record<Category, RubricCategory>;
