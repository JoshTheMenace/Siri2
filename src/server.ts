import "dotenv/config";
import express from "express";
import { runAgent } from "./agent.js";
import { initAppContext } from "./services/app-context.js";

const ctx = initAppContext();
const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", agent: "siri2", uptime: process.uptime() });
});

app.post("/command", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing 'prompt' string in request body" });
    return;
  }

  const lockOwner = `command-${Date.now()}`;
  ctx.deviceLock.acquire(lockOwner, "user");

  try {
    const result = await runAgent(prompt, { agentId: lockOwner });
    res.json({ result: result.text, turns: result.turns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  } finally {
    ctx.deviceLock.release(lockOwner);
  }
});

// ---------------------------------------------------------------------------
// Lock endpoints
// ---------------------------------------------------------------------------

app.get("/lock/status", (_req, res) => {
  res.json(ctx.deviceLock.getState());
});

app.post("/lock/release", (_req, res) => {
  ctx.deviceLock.forceRelease();
  res.json({ ok: true, message: "Lock released" });
});

// ---------------------------------------------------------------------------
// Notification watcher endpoints
// ---------------------------------------------------------------------------

app.post("/notifications/start", (_req, res) => {
  ctx.notificationQueue.start();
  res.json({ ok: true, message: "Notification watcher started" });
});

app.post("/notifications/stop", (_req, res) => {
  ctx.notificationQueue.stop();
  res.json({ ok: true, message: "Notification watcher stopped" });
});

app.get("/notifications/status", (_req, res) => {
  res.json({
    running: ctx.notificationQueue.isRunning(),
    queueLength: ctx.notificationQueue.getQueueLength(),
    filterCount: ctx.notificationFilter.getWhitelist().length,
  });
});

app.get("/notifications/log", (_req, res) => {
  res.json({ log: ctx.notificationQueue.getTriageLog() });
});

// ---------------------------------------------------------------------------
// Filter endpoints
// ---------------------------------------------------------------------------

app.get("/filter/whitelist", (_req, res) => {
  res.json({ packages: ctx.notificationFilter.getWhitelist() });
});

app.put("/filter/whitelist", (req, res) => {
  const { packages } = req.body;
  if (!Array.isArray(packages)) {
    res.status(400).json({ error: "Missing 'packages' array in request body" });
    return;
  }
  ctx.notificationFilter.setWhitelist(packages);
  res.json({ ok: true, packages: ctx.notificationFilter.getWhitelist() });
});

app.post("/filter/whitelist/add", (req, res) => {
  const pkg = req.body.package;
  if (!pkg || typeof pkg !== "string") {
    res.status(400).json({ error: "Missing 'package' string in request body" });
    return;
  }
  ctx.notificationFilter.addPackage(pkg);
  res.json({ ok: true, packages: ctx.notificationFilter.getWhitelist() });
});

app.post("/filter/whitelist/remove", (req, res) => {
  const pkg = req.body.package;
  if (!pkg || typeof pkg !== "string") {
    res.status(400).json({ error: "Missing 'package' string in request body" });
    return;
  }
  ctx.notificationFilter.removePackage(pkg);
  res.json({ ok: true, packages: ctx.notificationFilter.getWhitelist() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Siri2 HTTP server listening on 0.0.0.0:${PORT}`);
});
