# Centi CLI

## What Is This?

Centi CLI is a terminal-based AI chat tool that acts as a **multi-model switcher**. It uses **Claude** as the primary AI model and automatically falls back to **GitHub Copilot** when Claude hits rate limits.

## Architecture

Single-file Node.js CLI (`centi.js`) with no external dependencies.

### Entry Point
- `centi.js` - Main CLI script (runs via `#!/usr/bin/env node`)
- Registered as `centi` command via `package.json` `bin` field

### Flow
1. User types a prompt
2. Prompt is sent to Claude via `spawn` (`/opt/homebrew/bin/claude -p <prompt> --dangerously-skip-permissions`)
3. If Claude returns a limit/quota/429 error, auto-switches to Copilot
4. Copilot is called via `gh copilot explain "<prompt>"`
5. Context history is maintained in-memory across turns

### Key Components
- `callClaude(prompt)` - Spawns Claude CLI process, captures stdout/stderr
- `callCopilot(prompt)` - Executes `gh copilot explain` via exec
- `contextHistory[]` - In-memory conversation history (not yet passed to models)

## Conventions

### Code Style
- **Language**: Plain Node.js (CommonJS `require`)
- **No dependencies**: Zero npm dependencies - uses only Node.js built-ins (`readline`, `child_process`)
- **Colors**: ANSI escape codes directly (no chalk/colors library)
  - Cyan `\x1b[36m` - Banner/title
  - Yellow `\x1b[33m` - Subtitle
  - Green `\x1b[32m` - User prompt
  - Magenta `\x1b[35m` - Working indicator
  - Blue `\x1b[34m` - AI response prefix
  - Red `\x1b[31m` - Error/system messages
  - Reset `\x1b[0m`
- **Single file**: Everything lives in `centi.js`

### Naming
- kebab-case for files
- camelCase for variables and functions

## Commands

```bash
# Run directly
node centi.js

# Run via npm
npm start

# Install globally (after npm link)
centi
```

## Inspiration References

The `copilot-cli/` and `gemini-cli/` directories contain reference implementations for CLI welcome screens:
- **copilot-cli**: Animated banner on first launch, `--banner` flag to replay
- **gemini-cli**: ASCII art logo with gradient colors, responsive sizing, seasonal animations (snowfall in Dec/Jan), themed banners, rounded box borders using Ink/React terminal framework

These are **reference only** - not part of the centi-cli codebase.
