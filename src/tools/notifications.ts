import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { getNotifications } from "../services/notification-watcher.js";

export const getNotificationsTool = tool(
  "get_notifications",
  "Get all current Android notifications. Returns title, text, app, and available actions for each notification.",
  {},
  async () => {
    const notifications = await getNotifications();

    if (notifications.length === 0) {
      return {
        content: [
          { type: "text" as const, text: "No active notifications." },
        ],
      };
    }

    const formatted = notifications.map((n, i) => {
      const parts = [`[${i + 1}] ${n.packageName}`];
      if (n.title) parts.push(`  Title: ${n.title}`);
      if (n.text) parts.push(`  Text: ${n.text}`);
      if (n.subText) parts.push(`  Sub: ${n.subText}`);
      if (n.actions.length > 0) parts.push(`  Actions: ${n.actions.join(", ")}`);
      if (n.isOngoing) parts.push("  [ONGOING]");
      return parts.join("\n");
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Active notifications (${notifications.length}):\n\n${formatted.join("\n\n")}`,
        },
      ],
    };
  }
);
