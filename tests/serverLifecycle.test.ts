import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app";

let server: Server | undefined;

afterEach(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
  }
  server = undefined;
});

async function startApp(): Promise<string> {
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server?.once("error", reject);
    server?.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP listener.");
  return `http://127.0.0.1:${address.port}`;
}

describe("built app HTTP lifecycle", () => {
  it("serves health promptly without invoking Gemini", async () => {
    const baseUrl = await startApp();

    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_000) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: "ok" });
  });

  it("keeps analysis and explanation routes registered", async () => {
    const baseUrl = await startApp();
    const analysisResponse = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "javascript", code: "const message = 'Hello'; console.log(message);" })
    });
    const explanationResponse = await fetch(`${baseUrl}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    expect(analysisResponse.status).toBe(200);
    expect(explanationResponse.status).toBe(400);
    await expect(analysisResponse.json()).resolves.toMatchObject({ success: true, analysis: { findings: [] } });
  });
});
