import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";

export const launchApp = tool(
  "launch_app",
  "Launch an Android app by its package name. Use list_packages first if you don't know the package name.",
  {
    packageName: z
      .string()
      .describe(
        'Android package name (e.g. "com.google.android.gm" for Gmail)'
      ),
  },
  async ({ packageName }) => {
    const result = await executeShell(
      `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`,
      { timeout: 10_000 }
    );

    const success =
      result.stdout.includes("Events injected") || result.exitCode === 0;
    return {
      content: [
        {
          type: "text" as const,
          text: success
            ? `Launched ${packageName}`
            : `Failed to launch ${packageName}: ${result.stderr}`,
        },
      ],
    };
  }
);

export const listPackages = tool(
  "list_packages",
  "List installed Android packages. Optionally filter by keyword.",
  {
    filter: z
      .string()
      .optional()
      .describe("Optional keyword to filter packages (e.g. 'google', 'camera')"),
  },
  async ({ filter }) => {
    const result = await executeShell("pm list packages", { timeout: 10_000 });
    if (result.exitCode !== 0) {
      return {
        content: [
          { type: "text" as const, text: `Failed: ${result.stderr}` },
        ],
      };
    }

    let packages = result.stdout
      .split("\n")
      .map((l) => l.replace("package:", "").trim())
      .filter(Boolean);

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      packages = packages.filter((p) =>
        p.toLowerCase().includes(lowerFilter)
      );
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Installed packages${filter ? ` matching "${filter}"` : ""} (${packages.length}):\n${packages.join("\n")}`,
        },
      ],
    };
  }
);
