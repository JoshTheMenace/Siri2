import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";
import { readFile } from "node:fs/promises";

const SCREENSHOT_PATH = "/sdcard/siri2_screenshot.png";

export const takeScreenshot = tool(
  "take_screenshot",
  "Take a screenshot of the current screen. Returns the screenshot as a base64-encoded PNG that you can analyze visually.",
  {},
  async () => {
    const result = await executeShell(
      `screencap -p ${SCREENSHOT_PATH}`,
      { timeout: 10_000 }
    );

    if (result.exitCode !== 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot failed: ${result.stderr}`,
          },
        ],
      };
    }

    // Read the file and convert to base64
    // In Termux, /sdcard is accessible directly
    try {
      const catResult = await executeShell(`cat ${SCREENSHOT_PATH} | base64`, {
        timeout: 15_000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (!catResult.stdout) {
        return {
          content: [
            { type: "text" as const, text: "Screenshot taken but could not read file" },
          ],
        };
      }

      return {
        content: [
          {
            type: "image" as const,
            data: catResult.stdout.replace(/\s/g, ""),
            mimeType: "image/png",
          } as any,
        ],
      };
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot saved to ${SCREENSHOT_PATH} but could not encode to base64`,
          },
        ],
      };
    }
  }
);
