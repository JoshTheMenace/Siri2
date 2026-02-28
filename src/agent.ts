import { query } from "@anthropic-ai/claude-agent-sdk";
import { createAndroidServer } from "./tools/index.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export interface AgentResult {
  text: string;
  turns: number;
  costUsd: number;
}

export async function runAgent(prompt: string): Promise<AgentResult> {
  const androidServer = createAndroidServer();

  async function* messages() {
    yield {
      type: "user" as const,
      session_id: "",
      message: { role: "user" as const, content: prompt },
      parent_tool_use_id: null,
    };
  }

  let resultText = "";
  let turns = 0;
  let costUsd = 0;

  for await (const message of query({
    prompt: messages(),
    options: {
      model: "claude-sonnet-4-20250514",
      systemPrompt: SYSTEM_PROMPT,
      mcpServers: { android: androidServer },
      allowedTools: ["mcp__android__*"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 20,
    },
  })) {
    if (message.type === "assistant") {
      for (const block of message.message.content) {
        if (block.type === "text") {
          resultText = block.text;
          // Print assistant text as it arrives
          process.stderr.write(block.text);
        }
      }
    }

    if (message.type === "result") {
      if (message.subtype === "success") {
        resultText = message.result || resultText;
      } else {
        resultText = `Agent ended: ${message.subtype}${message.result ? " - " + message.result : ""}`;
      }
      turns = (message as any).num_turns ?? 0;
      costUsd = (message as any).total_cost_usd ?? 0;
    }
  }

  return { text: resultText, turns, costUsd };
}
