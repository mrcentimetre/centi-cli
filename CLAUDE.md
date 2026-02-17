# Centi CLI

## Project Goal: "Centi CLI" - Intelligent Model Switcher

### Objective
Create a unified Command Line Interface (CLI) tool using Node.js that acts as a smart wrapper for multiple AI models (Claude and GitHub Copilot). The tool allows users to chat with AI seamlessly while automatically managing usage limits.

### Core Logic

1. **Unified Interface**: User runs `centi` and gets an interactive chat prompt
2. **Primary Model (Claude)**: By default, user inputs are sent to the local Claude CLI
3. **Automatic Failover**: The system monitors the output from Claude. If it detects a "Rate Limit" or "Quota Exceeded" error, it automatically switches the active model to GitHub Copilot (`gh copilot`)
4. **Context Awareness**: The conversation history is preserved in memory across switches (future: pass to models)
5. **Zero Config**: Leverages the user's existing authenticated CLI sessions (no new API keys required)

### Current Status
✅ **Fully functional** with:
- Beautiful welcome screen with ASCII art
- Claude and Copilot integration working
- Automatic failover on rate limits
- Session persistence (save/resume conversations)
- Context history tracking

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

### Running Centi
```bash
# Run directly
node centi.js

# Run via npm
npm start

# Install globally (after npm link)
centi
```

### Available Commands (in CLI)

Type `/help` in the CLI to see all commands.

**Session Management:**
- `/save` - Save current conversation to a session file
- `/resume` - Resume a previously saved session (interactive picker)
- `/sessions` - List all saved sessions with timestamps
- `/clear` - Clear current conversation history
- `/history` - View current conversation history
- `/delete <number>` - Delete a specific session by number

**Model Control:**
- `/model` - Show active model and select a different one (interactive)
- `/switch` - Quickly toggle between Claude and Copilot
- `/test-copilot` - Test Copilot connection

**Help & Exit:**
- `/help` - Show all available commands with descriptions
- `/exit` or `/quit` - Close the CLI

### Session Storage
Sessions are saved to `~/.centi-sessions/` as JSON files containing:
- Start time and save time
- Current active model
- Full conversation history (user prompts + AI responses)

Sessions are timestamped and sorted by most recent first.

## Inspiration References

The `copilot-cli/` and `gemini-cli/` directories contain reference implementations for CLI welcome screens:
- **copilot-cli**: Animated banner on first launch, `--banner` flag to replay
- **gemini-cli**: ASCII art logo with gradient colors, responsive sizing, seasonal animations (snowfall in Dec/Jan), themed banners, rounded box borders using Ink/React terminal framework

These are **reference only** - not part of the centi-cli codebase.
