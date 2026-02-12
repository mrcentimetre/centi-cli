#!/usr/bin/env node
const readline = require('readline');
const { exec } = require('child_process');

console.log("\x1b[36m%s\x1b[0m", "Centi CLI v0.4 🤖 - Robust Exec");
console.log("\x1b[33m%s\x1b[0m", "Primary: Claude | Fallback: GitHub Copilot");
console.log("----------------------------------------");

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
