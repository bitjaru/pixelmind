# Pixelmind

> Your LLM is blind to what it creates. We give it eyes.

A render-aware feedback loop for LLM-generated UI. Three primitives:

```ts
import { render, see, critique, refine } from "@pixelmind/sdk"

const screenshot = await render({ code, viewport: "1440x900" })
const verdict    = await see({ screenshot, intent: "fintech dashboard" })
const fixPrompt  = critique(verdict)

// or all-in-one loop
const finalCode = await refine({
  initialCode,
  intent: "fintech dashboard",
  threshold: 80,
  generate: (code, fix) => myLLM.complete(code + fix),
})
```

## The problem

LLMs generate code in code-space (`p-4 gap-2 grid-cols-3`), but humans see pixels. The translation is lossy — your LLM thinks it shipped a great dashboard, but the rendered output is awkward. Today, every vibe coder closes this gap **by hand**: screenshot the result, eyeball it, type "the spacing is off" back to the LLM. Pixelmind closes the loop automatically.

## How it works

1. **`render`** — Playwright renders your TSX/HTML, captures a screenshot
2. **`see`** — A vision LLM (Claude Sonnet 4.6) judges the screenshot against your intent across 9 categories (hierarchy, spacing, typography, color, alignment, density, consistency, accessibility, brand fit)
3. **`critique`** — The verdict becomes a natural-language fix prompt the LLM can act on

The rubric is grounded in [StyleSeed](https://github.com/bitjaru/styleseed)'s 69 production design rules — design knowledge as visual scaffolding, not just code lint.

## Status

🚧 Pre-release. V1 SDK in development. Watch for `0.1.0` on npm.

## License

MIT
