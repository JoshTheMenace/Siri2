#!/usr/bin/env node
import "dotenv/config";
import { createInterface } from "node:readline";
import { runAgent, saveSession, loadSession, clearHistory } from "./agent.js";
import { initAppContext } from "./services/app-context.js";

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

const ctx = initAppContext();
const isInteractive = process.stdin.isTTY;

if (isInteractive) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

  console.log(
    "\x1b[1;35m" +
    "================================\n" +
    "  Siri2 - Android AI Agent\n" +
    "================================\x1b[0m\n" +
    "\x1b[90mCommands: /quit /save /load /clear /watch /lock /filter /help\x1b[0m\n"
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
      const subCmd = rest[0];
      const subArg = rest.slice(1).join(" ");

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

        case "/watch":
          switch (subCmd) {
            case "start":
              ctx.notificationQueue.start();
              console.log("\x1b[32mNotification watcher started.\x1b[0m");
              break;
            case "stop":
              ctx.notificationQueue.stop();
              console.log("\x1b[33mNotification watcher stopped.\x1b[0m");
              break;
            case "status":
              console.log(JSON.stringify({
                running: ctx.notificationQueue.isRunning(),
                queueLength: ctx.notificationQueue.getQueueLength(),
                filterCount: ctx.notificationFilter.getWhitelist().length,
              }, null, 2));
              break;
            case "log": {
              const log = ctx.notificationQueue.getTriageLog();
              if (log.length === 0) {
                console.log("\x1b[90mNo triage log entries.\x1b[0m");
              } else {
                for (const entry of log.slice(-20)) {
                  const time = new Date(entry.timestamp).toLocaleTimeString();
                  console.log(`  \x1b[90m${time}\x1b[0m ${entry.action.toUpperCase().padEnd(6)} ${entry.packageName} — ${entry.title}`);
                  if (entry.reason) console.log(`         \x1b[90m${entry.reason.slice(0, 100)}\x1b[0m`);
                }
              }
              break;
            }
            default:
              console.log("\x1b[33mUsage: /watch start|stop|status|log\x1b[0m");
          }
          break;

        case "/lock":
          switch (subCmd) {
            case "status":
              console.log(JSON.stringify(ctx.deviceLock.getState(), null, 2));
              break;
            case "release":
              ctx.deviceLock.forceRelease();
              console.log("\x1b[32mDevice lock released.\x1b[0m");
              break;
            default:
              console.log("\x1b[33mUsage: /lock status|release\x1b[0m");
          }
          break;

        case "/filter":
          switch (subCmd) {
            case "list":
              const pkgs = ctx.notificationFilter.getWhitelist();
              if (pkgs.length === 0) {
                console.log("\x1b[90mWhitelist is empty (no notifications will trigger the agent).\x1b[0m");
              } else {
                for (const pkg of pkgs) console.log(`  ${pkg}`);
              }
              break;
            case "add":
              if (!subArg) {
                console.log("\x1b[33mUsage: /filter add <package.name>\x1b[0m");
              } else {
                ctx.notificationFilter.addPackage(subArg);
                console.log(`\x1b[32mAdded: ${subArg}\x1b[0m`);
              }
              break;
            case "remove":
              if (!subArg) {
                console.log("\x1b[33mUsage: /filter remove <package.name>\x1b[0m");
              } else {
                ctx.notificationFilter.removePackage(subArg);
                console.log(`\x1b[32mRemoved: ${subArg}\x1b[0m`);
              }
              break;
            default:
              console.log("\x1b[33mUsage: /filter list|add <pkg>|remove <pkg>\x1b[0m");
          }
          break;

        case "/help":
          console.log(
            "/quit             Exit (saves session)\n" +
            "/save [name]      Save session\n" +
            "/load [name]      Load session\n" +
            "/clear            Clear history\n" +
            "/watch start      Start notification watcher\n" +
            "/watch stop       Stop notification watcher\n" +
            "/watch status     Show watcher status\n" +
            "/watch log        Show triage log\n" +
            "/lock status      Show device lock status\n" +
            "/lock release     Force-release device lock\n" +
            "/filter list      Show whitelisted packages\n" +
            "/filter add <pkg> Add package to whitelist\n" +
            "/filter remove <pkg> Remove package from whitelist"
          );
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
