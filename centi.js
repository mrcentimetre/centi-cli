#!/usr/bin/env node
const readline = require('readline');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Session Management ---
const SESSION_DIR = path.join(os.homedir(), '.centi-sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

function saveSession(sessionData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `session-${timestamp}.json`;
  const filepath = path.join(SESSION_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(sessionData, null, 2));
  return filepath;
}

function listSessions() {
  if (!fs.existsSync(SESSION_DIR)) {
    return [];
  }

  const files = fs.readdirSync(SESSION_DIR)
    .filter(f => f.startsWith('session-') && f.endsWith('.json'))
    .map(f => {
      const filepath = path.join(SESSION_DIR, f);
      const stats = fs.statSync(filepath);
      return {
        filename: f,
        filepath: filepath,
        modified: stats.mtime,
        size: stats.size
      };
    })
    .sort((a, b) => b.modified - a.modified); // Most recent first

  return files;
}

function loadSession(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function deleteSession(filepath) {
  fs.unlinkSync(filepath);
}

// --- Welcome Screen ---
function showWelcomeScreen() {
  const width = process.stdout.columns || 80;
  const centerPad = Math.max(0, Math.floor((width - 60) / 2));
  const pad = ' '.repeat(centerPad);

  // ASCII Art Logo
  const logo = [
    '   ██████╗███████╗███╗   ██╗████████╗██╗',
    '  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║',
    '  ██║     █████╗  ██╔██╗ ██║   ██║   ██║',
    '  ██║     ██╔══╝  ██║╚██╗██║   ██║   ██║',
    '  ╚██████╗███████╗██║ ╚████║   ██║   ██║',
    '   ╚═════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝'
  ];

  // Gradient colors (cyan -> magenta -> blue)
  const colors = ['\x1b[36m', '\x1b[95m', '\x1b[94m', '\x1b[35m', '\x1b[34m', '\x1b[36m'];

  console.clear();
  console.log('\n');

  // Box top
  console.log(pad + '\x1b[36m╭' + '─'.repeat(58) + '╮\x1b[0m');
  console.log(pad + '\x1b[36m│' + ' '.repeat(58) + '│\x1b[0m');

  // Render logo with gradient
  logo.forEach((line, i) => {
    const color = colors[i % colors.length];
    console.log(pad + '\x1b[36m│\x1b[0m' + color + '  ' + line + '\x1b[0m' + ' '.repeat(58 - line.length - 2) + '\x1b[36m│\x1b[0m');
  });

  console.log(pad + '\x1b[36m│' + ' '.repeat(58) + '│\x1b[0m');

  // Info section
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[33m🤖 Multi-Model AI Chat CLI\x1b[0m' + ' '.repeat(29) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[90mv0.3.0 - Spawn Upgrade\x1b[0m' + ' '.repeat(32) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│' + ' '.repeat(58) + '│\x1b[0m');

  // Model status
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[92m●\x1b[0m \x1b[1mPrimary:\x1b[0m Claude' + ' '.repeat(37) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[93m○\x1b[0m \x1b[1mFallback:\x1b[0m GitHub Copilot' + ' '.repeat(28) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│' + ' '.repeat(58) + '│\x1b[0m');

  // Commands
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[2mCommands: Type \x1b[36m/help\x1b[0m\x1b[2m for full list\x1b[0m' + ' '.repeat(21) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│\x1b[0m' + '    \x1b[36m/save\x1b[0m\x1b[2m /resume /sessions /clear /history\x1b[0m' + ' '.repeat(11) + '\x1b[36m│\x1b[0m');
  console.log(pad + '\x1b[36m│\x1b[0m' + '    \x1b[36m/model\x1b[0m\x1b[2m /switch /exit /quit\x1b[0m' + ' '.repeat(23) + '\x1b[36m│\x1b[0m');

  // Box bottom
  console.log(pad + '\x1b[36m│' + ' '.repeat(58) + '│\x1b[0m');
  console.log(pad + '\x1b[36m╰' + '─'.repeat(58) + '╯\x1b[0m');

  console.log('\n');
}

// Show welcome screen on startup
showWelcomeScreen();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32mYou > \x1b[0m'
});

let currentModel = 'Claude';
let contextHistory = [];
let sessionStartTime = new Date();

// Handle EPIPE errors gracefully
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') {
    process.exit(0);
  }
});

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (input === '/exit' || input === '/quit') {
    console.log('Bye! 👋');
    process.exit(0);
  }

  // Help command
  if (input === '/help') {
    console.log('\x1b[36m\n📚 Available Commands:\x1b[0m');
    console.log('\n\x1b[1mSession Management:\x1b[0m');
    console.log('  \x1b[36m/save\x1b[0m          - Save current conversation');
    console.log('  \x1b[36m/resume\x1b[0m        - Resume a previous session');
    console.log('  \x1b[36m/sessions\x1b[0m      - List all saved sessions');
    console.log('  \x1b[36m/delete <num>\x1b[0m  - Delete session by number');
    console.log('  \x1b[36m/clear\x1b[0m         - Clear current history');
    console.log('  \x1b[36m/history\x1b[0m       - View conversation history');
    console.log('\n\x1b[1mModel Control:\x1b[0m');
    console.log('  \x1b[36m/model\x1b[0m         - Show/select active model');
    console.log('  \x1b[36m/switch\x1b[0m        - Toggle between Claude/Copilot');
    console.log('\n\x1b[1mTesting:\x1b[0m');
    console.log('  \x1b[36m/test-copilot\x1b[0m  - Test Copilot connection');
    console.log('\n\x1b[1mExit:\x1b[0m');
    console.log('  \x1b[36m/exit\x1b[0m or \x1b[36m/quit\x1b[0m - Close the CLI\n');
    rl.prompt();
    return;
  }

  // Model command
  if (input === '/model') {
    console.log('\x1b[36m\n🤖 Available Models:\x1b[0m');
    const claudeIndicator = currentModel === 'Claude' ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';
    const copilotIndicator = currentModel === 'Copilot' ? '\x1b[32m●\x1b[0m' : '\x1b[90m○\x1b[0m';
    console.log(`  ${claudeIndicator} \x1b[1m1. Claude\x1b[0m - Anthropic's AI assistant`);
    console.log(`  ${copilotIndicator} \x1b[1m2. GitHub Copilot\x1b[0m - GitHub's AI assistant`);
    console.log(`\n  \x1b[33mCurrent: ${currentModel}\x1b[0m`);
    console.log('\n\x1b[2mType 1 or 2 to switch, or press Enter to cancel:\x1b[0m');

    rl.question('', (choice) => {
      if (choice.trim() === '1') {
        currentModel = 'Claude';
        console.log('\x1b[32m✓ Switched to Claude\x1b[0m');
      } else if (choice.trim() === '2') {
        currentModel = 'Copilot';
        console.log('\x1b[32m✓ Switched to Copilot\x1b[0m');
      } else if (choice.trim() !== '') {
        console.log('\x1b[31m✗ Invalid choice\x1b[0m');
      }
      rl.prompt();
    });
    return;
  }

  // Test commands
  if (input === '/test-copilot') {
    console.log('\x1b[33m[Testing Copilot...]\x1b[0m');
    const testResponse = await callCopilot('Say hello in one sentence');
    console.log(`\x1b[34mCopilot Test >\x1b[0m\n${testResponse}`);
    rl.prompt();
    return;
  }

  if (input === '/switch') {
    currentModel = currentModel === 'Claude' ? 'Copilot' : 'Claude';
    console.log(`\x1b[33m✓ Switched to ${currentModel}\x1b[0m`);
    rl.prompt();
    return;
  }

  // Session commands
  if (input === '/save') {
    const sessionData = {
      startTime: sessionStartTime,
      saveTime: new Date(),
      currentModel: currentModel,
      contextHistory: contextHistory
    };
    const filepath = saveSession(sessionData);
    console.log(`\x1b[32m✓ Session saved to: ${path.basename(filepath)}\x1b[0m`);
    console.log(`\x1b[90m  Location: ${filepath}\x1b[0m`);
    rl.prompt();
    return;
  }

  if (input === '/sessions') {
    const sessions = listSessions();
    if (sessions.length === 0) {
      console.log('\x1b[33mNo saved sessions found.\x1b[0m');
    } else {
      console.log(`\x1b[36m\n📋 Saved Sessions (${sessions.length}):\x1b[0m`);
      sessions.forEach((session, index) => {
        const date = session.modified.toLocaleString();
        const size = (session.size / 1024).toFixed(2);
        console.log(`\x1b[90m  ${index + 1}.\x1b[0m ${session.filename}`);
        console.log(`\x1b[90m     Modified: ${date} | Size: ${size}KB\x1b[0m`);
      });
      console.log('');
    }
    rl.prompt();
    return;
  }

  if (input === '/resume') {
    const sessions = listSessions();
    if (sessions.length === 0) {
      console.log('\x1b[33mNo saved sessions found. Use /save to create one.\x1b[0m');
      rl.prompt();
      return;
    }

    console.log(`\x1b[36m\n📋 Available Sessions:\x1b[0m`);
    sessions.forEach((session, index) => {
      const date = session.modified.toLocaleString();
      console.log(`\x1b[90m  ${index + 1}.\x1b[0m ${session.filename} \x1b[90m(${date})\x1b[0m`);
    });
    console.log('');

    rl.question('\x1b[33mEnter session number to resume (or 0 to cancel): \x1b[0m', (answer) => {
      const choice = parseInt(answer.trim());

      if (choice === 0 || isNaN(choice)) {
        console.log('\x1b[90mCancelled.\x1b[0m');
        rl.prompt();
        return;
      }

      if (choice < 1 || choice > sessions.length) {
        console.log('\x1b[31m✗ Invalid session number.\x1b[0m');
        rl.prompt();
        return;
      }

      const selectedSession = sessions[choice - 1];
      try {
        const sessionData = loadSession(selectedSession.filepath);
        contextHistory = sessionData.contextHistory || [];
        currentModel = sessionData.currentModel || 'Claude';
        sessionStartTime = new Date(sessionData.startTime);

        console.log(`\x1b[32m✓ Session resumed: ${selectedSession.filename}\x1b[0m`);
        console.log(`\x1b[90m  Started: ${new Date(sessionData.startTime).toLocaleString()}\x1b[0m`);
        console.log(`\x1b[90m  History: ${contextHistory.length} messages\x1b[0m`);
        console.log(`\x1b[90m  Model: ${currentModel}\x1b[0m`);

        // Show last few messages
        if (contextHistory.length > 0) {
          console.log(`\x1b[36m\n💬 Recent History:\x1b[0m`);
          const recent = contextHistory.slice(-4); // Last 4 messages
          recent.forEach(msg => {
            const [role, ...text] = msg.split(': ');
            const color = role === 'User' ? '\x1b[32m' : '\x1b[34m';
            console.log(`${color}${role}:\x1b[0m ${text.join(': ')}`);
          });
          console.log('');
        }
      } catch (error) {
        console.log(`\x1b[31m✗ Error loading session: ${error.message}\x1b[0m`);
      }

      rl.prompt();
    });
    return;
  }

  if (input.startsWith('/delete ')) {
    const sessionNum = parseInt(input.split(' ')[1]);
    const sessions = listSessions();

    if (isNaN(sessionNum) || sessionNum < 1 || sessionNum > sessions.length) {
      console.log('\x1b[31m✗ Invalid session number. Use /sessions to see available sessions.\x1b[0m');
      rl.prompt();
      return;
    }

    const sessionToDelete = sessions[sessionNum - 1];
    deleteSession(sessionToDelete.filepath);
    console.log(`\x1b[32m✓ Deleted session: ${sessionToDelete.filename}\x1b[0m`);
    rl.prompt();
    return;
  }

  if (input === '/clear') {
    const count = contextHistory.length;
    contextHistory = [];
    sessionStartTime = new Date();
    console.log(`\x1b[32m✓ Cleared ${count} messages from history\x1b[0m`);
    rl.prompt();
    return;
  }

  if (input === '/history') {
    if (contextHistory.length === 0) {
      console.log('\x1b[90mNo conversation history yet.\x1b[0m');
    } else {
      console.log(`\x1b[36m\n💬 Conversation History (${contextHistory.length} messages):\x1b[0m`);
      contextHistory.forEach((msg, index) => {
        const [role, ...text] = msg.split(': ');
        const color = role === 'User' ? '\x1b[32m' : '\x1b[34m';
        console.log(`\x1b[90m${index + 1}.\x1b[0m ${color}${role}:\x1b[0m ${text.join(': ')}`);
      });
      console.log('');
    }
    rl.prompt();
    return;
  }

  contextHistory.push(`User: ${input}`);
  console.log(`\x1b[35m[${currentModel} working...]\x1b[0m`);
  
  let response = "";
  
  if (currentModel === 'Claude') {
    response = await callClaude(input);

    // Debug: Show what Claude returned
    if (response === "limit_hit_trigger") {
        console.log("\x1b[31m[System] Claude Limit Hit! Switching to Copilot...\x1b[0m");
        currentModel = 'Copilot';
        response = await callCopilot(input);
    } else if (!response || response === "No response received") {
        console.log("\x1b[90m[DEBUG] Claude returned empty/no response\x1b[0m");
    }
  } else {
    response = await callCopilot(input);
  }

  console.log(`\x1b[34m${currentModel} >\x1b[0m\n${response}`);
  contextHistory.push(`AI: ${response}`);

  rl.prompt();
});

// --- Adapters ---

function callClaude(prompt) {
    return new Promise((resolve) => {
        const cmd = '/opt/homebrew/bin/claude';
        // Pass prompt via stdin to avoid CLI hanging
        const child = spawn(cmd, ['--dangerously-skip-permissions'], {
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = "";
        let errorOutput = "";
        let timer = null;

        // More specific rate limit detection
        const isRateLimitError = (text) => {
            const lowerText = text.toLowerCase();
            return (
                lowerText.includes("rate limit") ||
                lowerText.includes("quota exceeded") ||
                lowerText.includes("429") ||
                (lowerText.includes("limit") && (lowerText.includes("reached") || lowerText.includes("exceeded"))) ||
                lowerText.includes("too many requests")
            );
        };

        // Function to resolve when stream pauses or process closes
        const finish = () => {
            if (timer) clearTimeout(timer);
            timer = null;

            const fullText = output + errorOutput;

            // Check for rate limit indicators
            if (isRateLimitError(fullText)) {
                console.log('\x1b[90m[DEBUG] Rate limit detected in output\x1b[0m');
                child.kill();
                return resolve("limit_hit_trigger");
            }

            // Clean up and resolve
            child.kill();
            const result = output.trim() || errorOutput.trim();
            resolve(result || "No response received");
        };

        // Write prompt to stdin and close it
        child.stdin.write(prompt + '\n');
        child.stdin.end();

        child.stdout.on('data', (data) => {
            const str = data.toString();
            output += str;

            // Reset timer on each data chunk
            if (timer) clearTimeout(timer);
            timer = setTimeout(finish, 2000);
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();

            if (timer) clearTimeout(timer);
            timer = setTimeout(finish, 2000);
        });

        child.on('close', () => {
            if (timer) clearTimeout(timer);

            const fullText = output + errorOutput;

            // Check for rate limits
            if (isRateLimitError(fullText)) {
                return resolve("limit_hit_trigger");
            }

            // Return whatever we got
            resolve(output.trim() || errorOutput.trim() || "No response received");
        });

        child.on('error', (err) => {
            if (timer) clearTimeout(timer);
            resolve(`Error spawning Claude: ${err.message}`);
        });

        // Safety timeout (45 seconds max)
        timer = setTimeout(finish, 45000);
    });
}

function callCopilot(prompt) {
    return new Promise((resolve) => {
        const safePrompt = prompt.replace(/"/g, '\\"');
        // Use -p flag for non-interactive mode with --allow-all to skip permissions
        exec(`copilot -p "${safePrompt}" --allow-all`, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                return resolve(`Error: ${stderr || error.message}`);
            }
            resolve(stdout.trim());
        });
    });
}
