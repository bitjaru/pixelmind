import type { RenderInput, RenderResult, Viewport } from "./types.js";

const VIEWPORT_PRESETS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

function resolveViewport(v: Viewport | undefined): { width: number; height: number } {
  if (!v) return VIEWPORT_PRESETS.desktop!;
  if (typeof v === "string") return VIEWPORT_PRESETS[v] ?? VIEWPORT_PRESETS.desktop!;
  return { width: v.width, height: v.height };
}

/**
 * Render code to a screenshot.
 *
 * V1 stub: returns a placeholder. Real implementation uses Playwright +
 * an isolated browser context, wraps the code in a minimal HTML document
 * with optional skin CSS, waits `settleMs` for fonts/animations, then
 * screenshots the viewport.
 */
export async function render(input: RenderInput): Promise<RenderResult> {
  const vp = resolveViewport(input.viewport);
  // TODO: launch Playwright, build HTML scaffold, inject skin CSS, screenshot
  throw new Error("render() not yet implemented — V1 Phase 2");

  // unreachable, but documents the shape
  return {
    png: Buffer.alloc(0),
    html: input.code,
    css: "",
    errors: [],
    meta: {
      viewportWidth: vp.width,
      viewportHeight: vp.height,
      renderedAt: new Date().toISOString(),
    },
  };
}
