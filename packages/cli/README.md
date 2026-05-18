# @pixelmind/cli

CLI for [Pixelmind](https://github.com/bitjaru/pixelmind) — render-aware feedback for LLM-generated UI.

## Install

```bash
npm i -g @pixelmind/cli
npx playwright install chromium    # one-time, for the underlying SDK
```

Or run without installing:

```bash
npx @pixelmind/cli fix src/Dashboard.tsx --intent "fintech dashboard"
```

## Commands

```bash
pixelmind fix <file> --intent "<description>"     # score + print fix prompt
pixelmind score <file> --intent "<description>"   # score only
pixelmind --help                                   # show all options

# `pm` is a short alias for `pixelmind`
pm fix src/Dashboard.tsx --intent "..."
```

## Options

| Flag | Default | Description |
|---|---|---|
| `--intent` | required | What you wanted the UI to be |
| `--viewport` | `desktop` | `desktop` \| `mobile` \| `tablet` |
| `--skin` | none | Optional brand skin id (StyleSeed-compatible) |
| `--out` | stdout | Path to write the verdict JSON |

## Vision backend

Same as the SDK — auto-detects Codex CLI, then `OPENAI_API_KEY`, then `ANTHROPIC_API_KEY`. See [@pixelmind/sdk](https://www.npmjs.com/package/@pixelmind/sdk) for details.

## License

MIT
