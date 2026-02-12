#!/usr/bin/env node
const readline = require('readline');
const { exec } = require('child_process');

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
  console.log(pad + '\x1b[36m│\x1b[0m' + '  \x1b[2mCommands: \x1b[36mexit\x1b[0m\x1b[2m or \x1b[36mquit\x1b[0m\x1b[2m to close\x1b[0m' + ' '.repeat(22) + '\x1b[36m│\x1b[0m');

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

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (input === 'exit' || input === 'quit') {
    console.log('Bye! 👋');
    process.exit(0);
  }

  contextHistory.push(`User: ${input}`);
  console.log(`\x1b[35m[${currentModel} working...]\x1b[0m`);
  
  let response = "";
  
  if (currentModel === 'Claude') {
    response = await callClaude(input);
    
    if (response === "limit_hit_trigger") {
        console.log("\x1b[31m[System] Claude Limit Hit! Switching to Copilot...\x1b[0m");
        currentModel = 'Copilot';
        response = await callCopilot(input);
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
        const safePrompt = prompt.replace(/"/g, '\\"');
        const cmd = `/opt/homebrew/bin/claude -p "${safePrompt}" --dangerously-skip-permissions`;

        // Exec buffers output and waits for process to exit.
        // It returns an error if exit code != 0, BUT we can still read stdout/stderr.
        exec(cmd, { timeout: 45000 }, (error, stdout, stderr) => {
            const combined = (stdout || "") + (stderr || "");
            
            // 1. Check for Limit (Priority)
            if (combined.toLowerCase().includes("limit") || combined.toLowerCase().includes("quota") || combined.includes("429")) {
                return resolve("limit_hit_trigger");
            }

            // 2. Check for Real Error
            if (error) {
                // If it failed but NOT due to limit, return the error details
                return resolve(`Error Code: ${error.code}\nOutput: ${combined}`);
            }

            // 3. Success
            resolve(stdout.trim());
        });
    });
}

function callCopilot(prompt) {
    return new Promise((resolve) => {
        const safePrompt = prompt.replace(/"/g, '\\"');
        exec(`gh copilot explain "${safePrompt}"`, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                return resolve(`Error: ${stderr || error.message}`);
            }
            resolve(stdout.trim());
        });
    });
}
