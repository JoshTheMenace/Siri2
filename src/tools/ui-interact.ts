import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";

export const tap = tool(
  "tap",
  "Tap on the screen at the given (x, y) coordinates. Use dump_ui_tree first to find the right coordinates.",
  {
    x: z.number().describe("X coordinate to tap"),
    y: z.number().describe("Y coordinate to tap"),
  },
  async ({ x, y }) => {
    const result = await executeShell(`input tap ${x} ${y}`);
    return {
      content: [
        {
          type: "text" as const,
          text: result.exitCode === 0
            ? `Tapped at (${x}, ${y})`
            : `Tap failed: ${result.stderr}`,
        },
      ],
    };
  }
);

export const inputText = tool(
  "input_text",
  "Type text into the currently focused input field. Spaces are escaped automatically. Focus an input field first (tap on it) before using this.",
  {
    text: z.string().describe("Text to type"),
  },
  async ({ text }) => {
    // Android input text requires spaces as %s
    const escaped = text.replace(/ /g, "%s");
    const result = await executeShell(`input text '${escaped}'`);
    return {
      content: [
        {
          type: "text" as const,
          text: result.exitCode === 0
            ? `Typed: "${text}"`
            : `Input failed: ${result.stderr}`,
        },
      ],
    };
  }
);

export const pressKey = tool(
  "press_key",
  "Press an Android key. Common keycodes: HOME=3, BACK=4, ENTER=66, DEL=67, TAB=61, POWER=26, VOLUME_UP=24, VOLUME_DOWN=25, RECENT_APPS=187, SEARCH=84",
  {
    keycode: z
      .number()
      .describe("Android keycode number (e.g. 3=HOME, 4=BACK, 66=ENTER)"),
  },
  async ({ keycode }) => {
    const result = await executeShell(`input keyevent ${keycode}`);
    return {
      content: [
        {
          type: "text" as const,
          text: result.exitCode === 0
            ? `Pressed key ${keycode}`
            : `Key press failed: ${result.stderr}`,
        },
      ],
    };
  }
);

export const swipe = tool(
  "swipe",
  "Swipe on the screen from (x1,y1) to (x2,y2) over a duration in milliseconds. Use for scrolling: swipe up to scroll down.",
  {
    x1: z.number().describe("Start X coordinate"),
    y1: z.number().describe("Start Y coordinate"),
    x2: z.number().describe("End X coordinate"),
    y2: z.number().describe("End Y coordinate"),
    duration: z
      .number()
      .default(300)
      .describe("Swipe duration in milliseconds (default 300)"),
  },
  async ({ x1, y1, x2, y2, duration }) => {
    const result = await executeShell(
      `input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`
    );
    return {
      content: [
        {
          type: "text" as const,
          text: result.exitCode === 0
            ? `Swiped from (${x1},${y1}) to (${x2},${y2}) over ${duration}ms`
            : `Swipe failed: ${result.stderr}`,
        },
      ],
    };
  }
);
