#!/usr/bin/env node
const readline = require('readline');
const { exec } = require('child_process');

console.log("\x1b[36m%s\x1b[0m", "Centi CLI v0.2 🤖 - Real Integration");
console.log("\x1b[33m%s\x1b[0m", "Primary: Claude | Fallback: GitHub Copilot");
console.log("----------------------------------------");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32mYou > \x1b[0m'
});

let currentModel = 'Claude'; // Default
let contextHistory = []; // To keep track of conversation (simplistic for now)

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (input === 'exit' || input === 'quit') {
    console.log('Bye! 👋');
    process.exit(0);
  }

  // Save context (in memory only for now)
  contextHistory.push(`User: ${input}`);

  // Decide execution strategy
  console.log(`\x1b[35m[${currentModel} working...]\x1b[0m`);
  
  let response = "";
  
  if (currentModel === 'Claude') {
    response = await callClaude(input);
    
    // Check for Rate Limit / Error in response
    if (response.includes("429") || response.includes("limit") || response.includes("quota")) {
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
        // Assuming 'claude' CLI is installed and supports -p or direct input
        // Adjust command based on actual installed binary (e.g. 'claude-3')
        // Escaping quotes for shell safety (basic)
        const safePrompt = prompt.replace(/"/g, '\\"');
        
        // Use Absolute Path for Homebrew Claude
        const claudeCmd = '/opt/homebrew/bin/claude';
        
        exec(`${claudeCmd} -p "${safePrompt}" --dangerously-skip-permissions`, { timeout: 45000 }, (error, stdout, stderr) => {
            if (error) {
                // Return detailed error for debugging
                return resolve(`Error: ${error.message}\nSTDERR: ${stderr}`);
            }
            resolve(stdout.trim());
        });
    });
}

function callCopilot(prompt) {
    return new Promise((resolve) => {
        // Using 'gh copilot explain' as it's non-interactive usually
        const safePrompt = prompt.replace(/"/g, '\\"');
        
        exec(`gh copilot explain "${safePrompt}"`, { timeout: 15000 }, (error, stdout, stderr) => {
            if (error) {
                return resolve(`Error: ${stderr || error.message}`);
            }
            resolve(stdout.trim());
        });
    });
}
