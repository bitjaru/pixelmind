# @pixelmind/sdk

> Your LLM is blind to what it creates. We give it eyes.

Render-aware feedback loop for LLM-generated UI. Three primitives that close the gap between code space and pixel space.

```ts
import { render, see, critique, refine } from "@pixelmind/sdk"

const screenshot = await render({ code, viewport: "desktop" })
const verdict    = await see({ screenshot, intent: "fintech dashboard" })
const fixPrompt  = critique(verdict)
```

Or wire the whole loop in one call:

```ts
const result = await refine({
  initialCode,
  intent: "fintech dashboard, trustworthy tone",
  threshold: 85,
  maxIters: 3,
  generate: (code, fix) => myLLM.complete(`${code}\n\n${fix}`),
})
```

## Install

```bash
npm i @pixelmind/sdk
npx playwright install chromium    # one-time, for render()
```

## Pick a vision backend

Pixelmind auto-detects whichever is available, preferring Codex CLI (zero cost — rides on your ChatGPT subscription auth).

| Backend | Setup | Cost |
|---|---|---|
| **Codex CLI** | `npx --yes -p @openai/codex codex login` | $0 |
| OpenAI API | `OPENAI_API_KEY=sk-...` | ~$0.02 / call |
| Anthropic API | `ANTHROPIC_API_KEY=sk-ant-...` | ~$0.02 / call |

Override the choice per call: `see({ ..., provider: "openai" })`.

## What `see()` returns

```ts
type Verdict = {
  overallScore: number          // 0-100, weighted across categories
  scores: Record<Category, number>   // 9 categories: hierarchy, spacing,
                                      // typography, color, alignment, density,
                                      // consistency, accessibility, brand-fit
  issues: Array<{
    type: Category
    severity: "low" | "med" | "high"
    desc: string                // what's wrong, specifically
    suggestion: string          // imperative fix the LLM can act on
  }>
  strengths: string[]           // preserve these on rewrite
  meta: { model: string; rubric: string; judgedAt: string }
}
```

The 9-category rubric is grounded in [StyleSeed](https://github.com/bitjaru/styleseed)'s 69 production design rules.

## Full README

See the repo for hero before/after image, reproducible benchmarks, and the project status: https://github.com/bitjaru/pixelmind

## License

MIT
