import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createExplainController } from "../src/controllers/explanationController";
import { ExplanationNotConfiguredError, ExplanationProviderError, ExplanationService, GeminiExplanationProvider, type ExplanationProvider } from "../src/services/explanationService";

const validRequest = {
  language: "javascript",
  filename: "example.js",
  sourceContext: "console.log(undefinedVariable);",
  finding: { type: "error", severity: "high", line: 1, message: "'undefinedVariable' is not defined.", ruleId: "no-undef" }
};

function apiWith(provider: ExplanationProvider) {
  const app = express();
  app.use(express.json());
  app.post("/api/explain", createExplainController(new ExplanationService(provider)));
  return app;
}

describe("POST /api/explain", () => {
  it("returns a validated explanation from a mocked provider", async () => {
    const provider: ExplanationProvider = { generate: async () => JSON.stringify({ explanation: "The variable has no declaration.", suggestedFix: "Declare it before use.", caveats: "Check the intended scope." }) };

    const response = await request(apiWith(provider)).post("/api/explain").send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, explanation: { explanation: "The variable has no declaration.", suggestedFix: "Declare it before use.", caveats: "Check the intended scope." } });
  });

  it("returns a safe error when no Gemini API key is configured", async () => {
    const response = await request(apiWith(new GeminiExplanationProvider(""))).post("/api/explain").send(validRequest);

    expect(response.status).toBe(503);
    expect(response.body.error).toContain("not configured");
  });

  it.each(["provider failure", "timeout"])("returns a safe unavailable response for %s", async (reason) => {
    const provider: ExplanationProvider = { generate: async () => { throw new ExplanationProviderError(reason); } };

    const response = await request(apiWith(provider)).post("/api/explain").send(validRequest);

    expect(response.status).toBe(503);
    expect(response.body.error).toContain("currently unavailable");
  });

  it("rejects invalid requests before contacting the provider", async () => {
    const provider: ExplanationProvider = { generate: async () => { throw new Error("should not be called"); } };

    const response = await request(apiWith(provider)).post("/api/explain").send({ language: "python", sourceContext: "x", finding: {} });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects oversized source context", async () => {
    const provider: ExplanationProvider = { generate: async () => { throw new Error("should not be called"); } };

    const response = await request(apiWith(provider)).post("/api/explain").send({ ...validRequest, sourceContext: "x".repeat(8_001) });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("8000 character limit");
  });

  it("rejects malformed model output", async () => {
    const provider: ExplanationProvider = { generate: async () => "not json" };

    const response = await request(apiWith(provider)).post("/api/explain").send(validRequest);

    expect(response.status).toBe(502);
    expect(response.body.error).toContain("invalid response");
  });
});

describe("ExplanationService", () => {
  it("does not fabricate an explanation when a provider is unavailable", async () => {
    const provider: ExplanationProvider = { generate: async () => { throw new ExplanationNotConfiguredError("missing"); } };

    await expect(new ExplanationService(provider).explain(validRequest)).rejects.toBeInstanceOf(ExplanationNotConfiguredError);
  });
});
