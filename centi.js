#!/usr/bin/env node
const readline = require('readline');
const { spawn } = require('child_process');

console.log("\x1b[36m%s\x1b[0m", "Centi CLI v0.1 🤖 - The Ultimate Switcher");
console.log("\x1b[33m%s\x1b[0m", "Mode: Auto-Switch (Claude -> Copilot)");
console.log("----------------------------------------");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32mYou > \x1b[0m'
});

let currentModel = 'Claude'; // Start with Claude
let contextHistory = [];

rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  if (input === 'exit' || input === 'quit') {
    console.log('Bye! 👋');
    process.exit(0);
  }

  // 1. Save Context
  contextHistory.push({ role: 'user', content: input });

  // 2. Determine Model (Quota Check Mock)
  // For demo: if input contains "limit", switch model.
  if (input.includes('limit')) {
    currentModel = currentModel === 'Claude' ? 'Copilot' : 'Claude';
    console.log(`\x1b[31m[System] Quota limit hit! Switching to ${currentModel}...\x1b[0m`);
  }

  // 3. Process with Model
  console.log(`\x1b[35m[${currentModel} Thinking...]\x1b[0m`);
  
  try {
    const response = await getResponse(currentModel, input, contextHistory);
    console.log(`\x1b[34m${currentModel} >\x1b[0m ${response}`);
    contextHistory.push({ role: 'assistant', content: response });
  } catch (e) {
    console.error("Error:", e);
  }

  rl.prompt();
}).on('close', () => {
  console.log('Bye!');
  process.exit(0);
});

// Mock Function to simulate CLI call
async function getResponse(model, input, history) {
  return new Promise((resolve) => {
    // Here we will spawn the actual process later
    // spawn('claude', ['-p', input])
    
    setTimeout(() => {
        if(model === 'Copilot' && history.length > 1) {
            resolve(`(Context Aware): I see you said "${history[history.length-2].content}" earlier. Here is the answer.`);
        } else {
            resolve(`This is a response from ${model} for "${input}".`);
        }
    }, 1000);
  });
}
