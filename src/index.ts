#!/usr/bin/env node
import "dotenv/config";
import { createInterface } from "node:readline";
import { runAgent, saveSession, loadSession, clearHistory } from "./agent.js";

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error(
    "\x1b[31mNo credentials found.\x1b[0m\n\n" +
    "  Option A — OAuth subscription token:\n" +
    "    export ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-...\n\n" +
    "  Option B — API key:\n" +
    "    export ANTHROPIC_API_KEY=sk-ant-api03-...\n"
  );
  process.exit(1);
}

const isInteractive = process.stdin.isTTY;

if (isInteractive) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  console.log(
    "\x1b[1;35m" +
    "================================\n" +
    "  Siri2 - Android AI Agent\n" +
    "================================\x1b[0m\n" +
    "\x1b[90mCommands: /quit /save /load /clear /help\x1b[0m\n"
  );

  function showPrompt() {
    process.stdout.write("\x1b[1;32msiri2> \x1b[0m");
  }

  showPrompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { showPrompt(); return; }

    if (input.startsWith("/")) {
      const [cmd, ...rest] = input.split(/\s+/);
      const arg = rest.join(" ");
      switch (cmd) {
        case "/quit": case "/exit": case "/q":
          saveSession();
          console.log("\x1b[90mSession saved. Goodbye!\x1b[0m");
          process.exit(0);
          break;
        case "/save":
          console.log(`\x1b[32mSaved: ${saveSession(arg || "last")}\x1b[0m`);
          break;
        case "/load":
          if (loadSession(arg || "last")) console.log("\x1b[32mSession loaded.\x1b[0m");
          else console.log("\x1b[33mNo session found.\x1b[0m");
          break;
        case "/clear":
          clearHistory();
          console.log("\x1b[90mHistory cleared.\x1b[0m");
          break;
        case "/help":
          console.log("/quit /save [name] /load [name] /clear");
          break;
        default:
          console.log(`\x1b[33mUnknown: ${cmd}\x1b[0m`);
      }
      showPrompt();
      return;
    }

    process.stdout.write("\n");
    try {
      const result = await runAgent(input);
      process.stdout.write(`\n\n\x1b[90m[${result.turns} turns]\x1b[0m\n\n`);
    } catch (err: any) {
      console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
    }
    showPrompt();
  });

  rl.on("close", () => {
    saveSession();
    console.log("\n\x1b[90mSession saved. Goodbye!\x1b[0m");
    process.exit(0);
  });
} else {
  // Piped input: read all, run once, exit
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => (input += chunk));
  process.stdin.on("end", async () => {
    const trimmed = input.trim();
    if (!trimmed) { console.error("No input"); process.exit(1); }
    try {
      const result = await runAgent(trimmed);
      console.log(`\n[${result.turns} turns]`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
}
