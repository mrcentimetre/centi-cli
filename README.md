# Centi CLI

A unified terminal chat interface that wraps Claude and GitHub Copilot with automatic rate-limit failover. When Claude hits its usage limit, Centi silently switches to GitHub Copilot so your workflow is never interrupted.

```
   ██████╗███████╗███╗   ██╗████████╗██╗
  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║
  ██║     █████╗  ██╔██╗ ██║   ██║   ██║
  ██║     ██╔══╝  ██║╚██╗██║   ██║   ██║
  ╚██████╗███████╗██║ ╚████║   ██║   ██║
   ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝
```

## Features

- **Automatic failover** - Detects rate limits / quota errors and switches to Copilot mid-conversation
- **Session persistence** - Save, list, resume, and delete past conversations
- **Manual model control** - Switch between Claude and Copilot at any time
- **Context history** - Full conversation history tracked in-memory per session
- **Zero config** - Uses your existing authenticated CLI sessions, no new API keys

## Prerequisites

Both CLIs must be installed and authenticated before running Centi:

- [Claude CLI](https://docs.anthropic.com/claude-code) (`claude`) - authenticated via `claude auth`
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli) (`copilot`) - authenticated via `gh auth login`

> Centi expects Claude at `/opt/homebrew/bin/claude` (Homebrew on macOS). If yours is elsewhere, update the `cmd` path in `callClaude()` inside `centi.js`.

## Installation

```bash
git clone https://github.com/nimsaraonline/centi-cli.git
cd centi-cli
npm link          # registers the `centi` command globally
```

To uninstall:

```bash
npm unlink -g centi-cli
```

## Usage

```bash
centi
```

Or without installing globally:

```bash
node centi.js
# or
npm start
```

## Commands

Type any message to chat. Use `/` commands to control the session.

### Session Management

| Command | Description |
|---------|-------------|
| `/save` | Save the current conversation to `~/.centi-sessions/` |
| `/resume` | Pick and restore a previously saved session |
| `/sessions` | List all saved sessions with timestamps and sizes |
| `/delete <number>` | Delete a specific session by its list number |
| `/history` | View all messages in the current session |
| `/clear` | Wipe the current conversation history |

### Model Control

| Command | Description |
|---------|-------------|
| `/model` | Show available models and switch interactively |
| `/switch` | Toggle directly between Claude and Copilot |
| `/test-copilot` | Send a test message to verify Copilot is working |

### Other

| Command | Description |
|---------|-------------|
| `/help` | Print the full command reference |
| `/exit` / `/quit` | Close the CLI |

## How Failover Works

1. Every user message is sent to Claude via `spawn` (streaming stdout/stderr)
2. Output is scanned for rate limit signals: `rate limit`, `quota exceeded`, `429`, `too many requests`
3. On detection, Centi switches `currentModel` to `Copilot` and replays the same prompt
4. All subsequent messages go to Copilot until you manually switch back with `/switch` or `/model`

## Session Files

Sessions are stored as JSON in `~/.centi-sessions/`:

```json
{
  "startTime": "2026-02-17T10:00:00.000Z",
  "saveTime": "2026-02-17T10:30:00.000Z",
  "currentModel": "Claude",
  "contextHistory": [
    "User: explain async/await",
    "AI: Async/await is..."
  ]
}
```

## Project Structure

```
centi-cli/
├── centi.js        # Entire CLI - single file, zero dependencies
├── package.json
└── README.md
```

All logic lives in `centi.js`. No build step, no external packages - only Node.js built-ins (`readline`, `child_process`, `fs`, `path`, `os`).

## License

MIT
