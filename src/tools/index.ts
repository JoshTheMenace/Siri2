import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { dumpUiTree } from "./ui-tree.js";
import { tap, inputText, pressKey, swipe } from "./ui-interact.js";
import { launchApp, listPackages } from "./app-launch.js";
import { runShell } from "./shell.js";
import { takeScreenshot } from "./screenshot.js";
import { getNotificationsTool } from "./notifications.js";
import { getDeviceInfo } from "./device-info.js";

export function createAndroidServer() {
  return createSdkMcpServer({
    name: "android",
    version: "1.0.0",
    tools: [
      dumpUiTree,
      tap,
      inputText,
      pressKey,
      swipe,
      launchApp,
      listPackages,
      runShell,
      takeScreenshot,
      getNotificationsTool,
      getDeviceInfo,
    ],
  });
}
