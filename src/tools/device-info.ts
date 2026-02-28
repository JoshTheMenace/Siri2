import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeShell } from "../services/shell-executor.js";

export const getDeviceInfo = tool(
  "get_device_info",
  "Get current device status: battery level, WiFi state, screen state, and the currently focused app.",
  {},
  async () => {
    const [battery, wifi, display, activity] = await Promise.all([
      executeShell("dumpsys battery | grep -E 'level|status|plugged'"),
      executeShell("dumpsys wifi | grep 'Wi-Fi is' | head -1"),
      executeShell("dumpsys display | grep 'mScreenState' | head -1"),
      executeShell(
        "dumpsys activity activities | grep 'mResumedActivity' | head -1"
      ),
    ]);

    const parts: string[] = [];
    if (battery.stdout) parts.push(`Battery:\n${battery.stdout.trim()}`);
    if (wifi.stdout) parts.push(`WiFi: ${wifi.stdout.trim()}`);
    if (display.stdout) parts.push(`Display: ${display.stdout.trim()}`);
    if (activity.stdout) parts.push(`Foreground: ${activity.stdout.trim()}`);

    return {
      content: [
        {
          type: "text" as const,
          text: parts.join("\n") || "Could not retrieve device info",
        },
      ],
    };
  }
);
