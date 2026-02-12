#!/usr/bin/env node
const readline = require('readline');
const { spawn, exec } = require('child_process');

console.log("\x1b[36m%s\x1b[0m", "Centi CLI v0.3 🤖 - Spawn Upgrade");
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
    
    // Check strict trigger phrase
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
        // Using spawn for better stream handling
        const child = spawn(cmd, ['-p', prompt, '--dangerously-skip-permissions'], {
            env: process.env, // Pass environment variables
            shell: true       // Run in shell to match terminal behavior
        });

        let output = "";
        let errorOutput = "";

        child.stdout.on('data', (data) => { output += data.toString(); });
        child.stderr.on('data', (data) => { errorOutput += data.toString(); });

        child.on('close', (code) => {
            const fullText = (output + errorOutput).toLowerCase();
            
            // Debug Log (Hidden in normal use, enabled if needed)
            // console.log("DEBUG RAW:", fullText);

            if (fullText.includes("limit") || fullText.includes("quota") || fullText.includes("429")) {
                return resolve("limit_hit_trigger");
            }

            if (code !== 0) {
                return resolve(`Exit Code: ${code}\nSTDOUT: ${output}\nSTDERR: ${errorOutput}`);
            }
            
            resolve(output.trim());
        });

        child.on('error', (err) => {
            resolve(`Spawn Error: ${err.message}`);
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
