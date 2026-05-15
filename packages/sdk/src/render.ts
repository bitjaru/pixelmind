import { chromium, type Browser } from "playwright";
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

/** Heuristic — if the input looks like a full HTML document, use it directly. */
function isFullHtml(code: string): boolean {
  const trimmed = code.trim();
  return /^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed);
}

/** Wrap a JSX/TSX snippet in a minimal HTML document that compiles via Babel. */
function buildJsxScaffold(jsxCode: string): string {
  // The JSX could be either an expression (`<div>...</div>`) or a component
  // declaration. We wrap as an expression first; if the LLM emitted a
  // component, the user can include it explicitly in their input.
  const safeCode = jsxCode.trim();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pixelmind render</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    const __PixelmindApp = () => (${safeCode});
    ReactDOM.createRoot(document.getElementById("root")).render(<__PixelmindApp />);
  </script>
</body>
</html>`;
}

let browserSingleton: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserSingleton && browserSingleton.isConnected()) return browserSingleton;
  browserSingleton = await chromium.launch({ headless: true });
  return browserSingleton;
}

/**
 * Render code to a screenshot using a headless Chromium.
 *
 * Detects whether `code` is a full HTML document (used verbatim) or a
 * JSX/TSX snippet (wrapped in a Babel-standalone + React + Tailwind CDN
 * scaffold). Waits `settleMs` (default 800) for fonts and animations,
 * then captures the viewport.
 *
 * The returned `html` is the document actually loaded — useful when
 * debugging why a render came out blank. Console errors are captured
 * for inclusion in `errors`.
 */
export async function render(input: RenderInput): Promise<RenderResult> {
  const vp = resolveViewport(input.viewport);
  const settleMs = input.settleMs ?? 800;
  const html = isFullHtml(input.code) ? input.code : buildJsxScaffold(input.code);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
    if (settleMs > 0) await page.waitForTimeout(settleMs);
    const png = await page.screenshot({ type: "png", fullPage: false });
    const renderedCss = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets
        .map((s) => {
          try {
            return Array.from(s.cssRules ?? [])
              .map((r) => r.cssText)
              .join("\n");
          } catch {
            return ""; // cross-origin sheet
          }
        })
        .join("\n");
    });

    return {
      png,
      html,
      css: renderedCss,
      errors,
      meta: {
        viewportWidth: vp.width,
        viewportHeight: vp.height,
        renderedAt: new Date().toISOString(),
      },
    };
  } finally {
    await context.close();
  }
}

/**
 * Shut down the shared browser instance. Call at end of long-running
 * scripts to let the process exit cleanly.
 */
export async function closeBrowser(): Promise<void> {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}
