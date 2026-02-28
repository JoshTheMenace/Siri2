import { executeShell } from "../services/shell-executor.js";
import { parseUiDump } from "../services/xml-parser.js";
import { getNotifications } from "../services/notification-watcher.js";

// ---------------------------------------------------------------------------
// UI tools that require device lock
// ---------------------------------------------------------------------------

export const UI_TOOLS = new Set([
  "dump_ui_tree", "tap", "input_text", "press_key", "swipe", "take_screenshot",
]);

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const toolImplementations: Record<string, (args: any) => Promise<string>> = {};

function defineTool(
  name: string,
  description: string,
  inputSchema: Record<string, any>,
  execute: (args: any) => Promise<string>
) {
  toolImplementations[name] = execute;
  return { name, description, input_schema: inputSchema };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const toolDefs = [
  defineTool(
    "dump_ui_tree",
    "Dump the current Android UI tree. Returns all visible UI elements with text, positions, and whether they are clickable/scrollable. Use this before interacting with the screen.",
    { type: "object", properties: {} },
    async () => {
      const dump = await executeShell(
        "uiautomator dump /sdcard/window_dump.xml && cat /sdcard/window_dump.xml",
        { timeout: 15_000 }
      );
      if (dump.exitCode !== 0 || !dump.stdout.includes("<hierarchy")) {
        return JSON.stringify({ ok: false, error: dump.stderr || "Failed to dump UI tree" });
      }
      const tree = parseUiDump(dump.stdout);
      const formatted = tree.nodes.map((n, i) => {
        const parts: string[] = [];
        if (n.text) parts.push(`text="${n.text}"`);
        if (n.contentDesc) parts.push(`desc="${n.contentDesc}"`);
        if (n.resourceId) parts.push(`id="${n.resourceId}"`);
        parts.push(`pos=(${n.centerX},${n.centerY})`);
        if (n.clickable) parts.push("CLICKABLE");
        if (n.scrollable) parts.push("SCROLLABLE");
        if (n.checked) parts.push("CHECKED");
        if (n.focused) parts.push("FOCUSED");
        return `[${i}] ${parts.join(" | ")}`;
      });
      return JSON.stringify({
        ok: true,
        packageName: tree.packageName,
        elementCount: tree.nodes.length,
        elements: formatted.join("\n"),
      });
    }
  ),

  defineTool(
    "tap",
    "Tap on screen at (x, y) coordinates. Use dump_ui_tree first to find coordinates.",
    {
      type: "object",
      properties: {
        x: { type: "number", description: "X coordinate" },
        y: { type: "number", description: "Y coordinate" },
      },
      required: ["x", "y"],
    },
    async (args) => {
      const r = await executeShell(`input tap ${args.x} ${args.y}`);
      return JSON.stringify({ ok: r.exitCode === 0, action: `tapped (${args.x},${args.y})` });
    }
  ),

  defineTool(
    "input_text",
    "Type text into the currently focused input field. Tap the field first to focus it.",
    {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to type" },
      },
      required: ["text"],
    },
    async (args) => {
      const escaped = args.text.replace(/ /g, "%s");
      const r = await executeShell(`input text '${escaped}'`);
      return JSON.stringify({ ok: r.exitCode === 0, typed: args.text });
    }
  ),

  defineTool(
    "press_key",
    "Press an Android key. Common: HOME=3, BACK=4, ENTER=66, DEL=67, TAB=61, RECENT_APPS=187",
    {
      type: "object",
      properties: {
        keycode: { type: "number", description: "Android keycode (e.g. 3=HOME, 4=BACK, 66=ENTER)" },
      },
      required: ["keycode"],
    },
    async (args) => {
      const r = await executeShell(`input keyevent ${args.keycode}`);
      return JSON.stringify({ ok: r.exitCode === 0, key: args.keycode });
    }
  ),

  defineTool(
    "swipe",
    "Swipe on screen. Use for scrolling: swipe bottom-to-top to scroll down.",
    {
      type: "object",
      properties: {
        x1: { type: "number", description: "Start X" },
        y1: { type: "number", description: "Start Y" },
        x2: { type: "number", description: "End X" },
        y2: { type: "number", description: "End Y" },
        duration: { type: "number", description: "Duration ms (default 300)" },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
    async (args) => {
      const dur = args.duration || 300;
      const r = await executeShell(`input swipe ${args.x1} ${args.y1} ${args.x2} ${args.y2} ${dur}`);
      return JSON.stringify({ ok: r.exitCode === 0 });
    }
  ),

  defineTool(
    "launch_app",
    "Launch an Android app by package name. Use list_packages to find package names.",
    {
      type: "object",
      properties: {
        package_name: { type: "string", description: "Package name (e.g. com.google.android.gm)" },
      },
      required: ["package_name"],
    },
    async (args) => {
      const r = await executeShell(
        `monkey -p ${args.package_name} -c android.intent.category.LAUNCHER 1`,
        { timeout: 10_000 }
      );
      return JSON.stringify({ ok: r.exitCode === 0 || r.stdout.includes("Events injected"), launched: args.package_name });
    }
  ),

  defineTool(
    "list_packages",
    "List installed Android packages, optionally filtered by keyword.",
    {
      type: "object",
      properties: {
        filter: { type: "string", description: "Optional keyword filter" },
      },
    },
    async (args) => {
      const r = await executeShell("pm list packages", { timeout: 10_000 });
      if (r.exitCode !== 0) return JSON.stringify({ ok: false, error: r.stderr });
      let pkgs = r.stdout.split("\n").map((l) => l.replace("package:", "").trim()).filter(Boolean);
      if (args.filter) {
        const f = args.filter.toLowerCase();
        pkgs = pkgs.filter((p) => p.toLowerCase().includes(f));
      }
      return JSON.stringify({ ok: true, count: pkgs.length, packages: pkgs });
    }
  ),

  defineTool(
    "run_shell",
    "Execute a shell command as root via su -c.",
    {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        timeout: { type: "number", description: "Timeout ms (default 10000)" },
      },
      required: ["command"],
    },
    async (args) => {
      const r = await executeShell(args.command, { timeout: args.timeout || 10_000 });
      return JSON.stringify({ ok: r.exitCode === 0, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode });
    }
  ),

  defineTool(
    "take_screenshot",
    "Take a screenshot. Returns base64 PNG.",
    { type: "object", properties: {} },
    async () => {
      const r = await executeShell("screencap -p /sdcard/siri2_screenshot.png", { timeout: 10_000 });
      if (r.exitCode !== 0) return JSON.stringify({ ok: false, error: r.stderr });
      const b64 = await executeShell("cat /sdcard/siri2_screenshot.png | base64", {
        timeout: 15_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      if (!b64.stdout) return JSON.stringify({ ok: false, error: "Could not encode screenshot" });
      return JSON.stringify({ ok: true, base64: b64.stdout.replace(/\s/g, "").slice(0, 100000) });
    }
  ),

  defineTool(
    "get_notifications",
    "Get all current Android notifications with title, text, app, and available actions.",
    { type: "object", properties: {} },
    async () => {
      const notifications = await getNotifications();
      return JSON.stringify({
        ok: true,
        count: notifications.length,
        notifications: notifications.map((n) => ({
          package: n.packageName,
          title: n.title,
          text: n.text,
          actions: n.actions,
          ongoing: n.isOngoing,
        })),
      });
    }
  ),

  defineTool(
    "get_device_info",
    "Get device status: battery, WiFi, screen state, foreground app.",
    { type: "object", properties: {} },
    async () => {
      const [battery, wifi, display, activity] = await Promise.all([
        executeShell("dumpsys battery | grep -E 'level|status|plugged'"),
        executeShell("dumpsys wifi | grep 'Wi-Fi is' | head -1"),
        executeShell("dumpsys display | grep 'mScreenState' | head -1"),
        executeShell("dumpsys activity activities | grep 'mResumedActivity' | head -1"),
      ]);
      return JSON.stringify({
        ok: true,
        battery: battery.stdout.trim(),
        wifi: wifi.stdout.trim(),
        display: display.stdout.trim(),
        foreground: activity.stdout.trim(),
      });
    }
  ),
];
