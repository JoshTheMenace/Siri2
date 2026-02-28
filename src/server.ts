import "dotenv/config";
import express from "express";
import { runAgent } from "./agent.js";

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

  try {
    const result = await runAgent(prompt);
    res.json({
      result: result.text,
      turns: result.turns,
      costUsd: result.costUsd,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Siri2 HTTP server listening on 0.0.0.0:${PORT}`);
  console.log(`  POST /command  - Send a command`);
  console.log(`  GET  /health   - Health check`);
});
