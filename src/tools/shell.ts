import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";

export const runShell = tool(
  "run_shell",
  "Execute an arbitrary shell command as root. Use for anything not covered by other tools. The command runs via 'su -c'.",
  {
    command: z.string().describe("Shell command to execute"),
    timeout: z
      .number()
      .optional()
      .describe("Timeout in milliseconds (default 10000)"),
  },
  async ({ command, timeout }) => {
    const result = await executeShell(command, {
      timeout: timeout ?? 10_000,
    });

    const parts: string[] = [];
    if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
    if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
    parts.push(`exit code: ${result.exitCode}`);

    return {
      content: [{ type: "text" as const, text: parts.join("\n") }],
    };
  }
);
