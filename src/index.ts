import "dotenv/config";
import { createInterface } from "node:readline";
import { runAgent } from "./agent.js";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Siri2 - Android AI Agent");
console.log('Type your commands, or "exit" to quit.\n');

function prompt() {
  rl.question("siri2> ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      prompt();
      return;
    }
    if (trimmed === "exit" || trimmed === "quit") {
      console.log("Goodbye!");
      rl.close();
      process.exit(0);
    }

    try {
      console.log("\nThinking...\n");
      const result = await runAgent(trimmed);
      console.log(result.text);
      console.log(
        `\n[${result.turns} turns, $${result.costUsd.toFixed(4)}]\n`
      );
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
    }

    prompt();
  });
}

prompt();
