import "dotenv/config";
import { createInterface } from "node:readline";
import { runAgent } from "./agent.js";

// Support both interactive and piped input
const isInteractive = process.stdin.isTTY;

if (isInteractive) {
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
        console.error(`Error: ${err.message}\n${err.stack}`);
      }

      prompt();
    });
  }

  prompt();
} else {
  // Piped input: read all of stdin, run once, exit
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      console.error("No input provided");
      process.exit(1);
    }
    try {
      const result = await runAgent(trimmed);
      console.log(result.text);
      console.log(
        `\n[${result.turns} turns, $${result.costUsd.toFixed(4)}]`
      );
    } catch (err: any) {
      console.error(`Error: ${err.message}\n${err.stack}`);
      process.exit(1);
    }
  });
}
