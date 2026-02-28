import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";
import { parseUiDump } from "../services/xml-parser.js";

const DUMP_PATH = "/sdcard/window_dump.xml";

export const dumpUiTree = tool(
  "dump_ui_tree",
  "Dump the current Android UI tree. Returns all visible UI elements with their text, positions, and whether they are clickable/scrollable. Use this to understand what's on screen before interacting.",
  {},
  async () => {
    // Dump UI hierarchy to file
    const dump = await executeShell(
      `uiautomator dump ${DUMP_PATH} && cat ${DUMP_PATH}`,
      { timeout: 15_000 }
    );

    if (dump.exitCode !== 0 || !dump.stdout.includes("<hierarchy")) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to dump UI tree. stderr: ${dump.stderr}`,
          },
        ],
      };
    }

    const tree = parseUiDump(dump.stdout);

    // Format nodes for readability
    const formatted = tree.nodes.map((n) => {
      const parts: string[] = [];
      if (n.text) parts.push(`text="${n.text}"`);
      if (n.contentDesc) parts.push(`desc="${n.contentDesc}"`);
      if (n.resourceId) parts.push(`id="${n.resourceId}"`);
      parts.push(`pos=(${n.centerX},${n.centerY})`);
      if (n.clickable) parts.push("CLICKABLE");
      if (n.scrollable) parts.push("SCROLLABLE");
      if (n.checked) parts.push("CHECKED");
      if (n.focused) parts.push("FOCUSED");
      return `[${n.index}] ${parts.join(" | ")}`;
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Package: ${tree.packageName}\nUI Elements (${tree.nodes.length}):\n${formatted.join("\n")}`,
        },
      ],
    };
  }
);
