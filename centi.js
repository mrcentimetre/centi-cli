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
        const cmd = '/opt/homebrew/bin/claude';
        const child = spawn(cmd, ['-p', prompt, '--dangerously-skip-permissions'], {
            env: process.env
        });

        let output = "";
        let errorOutput = "";
        let timer = null;

        // Debounce function to resolve when stream pauses
        const finish = () => {
            if (timer) clearTimeout(timer);
            const fullText = (output + errorOutput).toLowerCase();
            
            if (fullText.includes("limit") || fullText.includes("quota") || fullText.includes("429")) {
                child.kill(); // Kill process if limit hit
                return resolve("limit_hit_trigger");
            }
            
            child.kill(); // Kill process as we assume it's done
            resolve(output.trim() || errorOutput.trim());
        };

        child.stdout.on('data', (data) => {
            output += data.toString();
            // Reset timer on new data
            if (timer) clearTimeout(timer);
            timer = setTimeout(finish, 2000); // Wait 2s for more data, else finish
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
            if (timer) clearTimeout(timer);
            timer = setTimeout(finish, 2000);
        });

        child.on('close', (code) => {
            if (timer) clearTimeout(timer);
            const fullText = (output + errorOutput).toLowerCase();
            if (fullText.includes("limit") || fullText.includes("quota")) {
                return resolve("limit_hit_trigger");
            }
            resolve(output.trim() || errorOutput.trim());
        });
        
        // Initial timeout if nothing happens
        timer = setTimeout(finish, 45000);
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
