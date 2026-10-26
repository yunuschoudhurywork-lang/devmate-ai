import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createReviewSummaryController } from "../src/controllers/reviewSummaryController";
import { ExplanationNotConfiguredError, ExplanationProviderError, GeminiExplanationProvider, type ExplanationProvider } from "../src/services/explanationService";
import { ReviewSummaryService } from "../src/services/reviewSummaryService";
import type { AnalysisResult } from "../src/types/analysis";

const validAnalysisResult: AnalysisResult = {
  language: "javascript",
  findings: [
    { type: "error", severity: "high", line: 1, message: "'undefinedVariable' is not defined.", ruleId: "no-undef" },
    { type: "security", severity: "medium", line: 5, message: "Potential XSS vulnerability.", ruleId: "xss-check" }
  ],
  summary: { total: 2, errors: 1, warnings: 0, security: 1, performance: 0 },
  quality: { overall: 85, categories: { correctness: 85, security: 92, performance: 100 } }
};

const emptyAnalysisResult: AnalysisResult = {
  language: "typescript",
  findings: [],
  summary: { total: 0, errors: 0, warnings: 0, security: 0, performance: 0 },
  quality: { overall: 100, categories: { correctness: 100, security: 100, performance: 100 } }
};

const validRequest = {
  language: "javascript",
  filename: "example.js",
  analysisResult: validAnalysisResult
};

function apiWith(provider: ExplanationProvider) {
  const app = express();
  app.use(express.json());
  app.post("/api/review-summary", createReviewSummaryController(new ReviewSummaryService(provider)));
  return app;
}

describe("POST /api/review-summary", () => {
  it("returns a validated review summary from a mocked provider", async () => {
    const provider: ExplanationProvider = {
      generate: async () => JSON.stringify({
        summary: "The code has 2 findings including a high-severity undefined variable error and a medium-severity XSS risk.",
        keyRisks: ["Undefined variable will cause runtime errors", "XSS vulnerability may expose user data"],
        priorities: ["Fix the undefined variable error", "Review and sanitize user input to prevent XSS"],
        caveats: "Static analysis may not detect all runtime issues."
      })
    };

    const response = await request(apiWith(provider)).post("/api/review-summary").send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary).toMatchObject({
      summary: expect.any(String),
      keyRisks: expect.any(Array),
      priorities: expect.any(Array),
      caveats: expect.any(String)
    });
    expect(response.body.summary.keyRisks).toHaveLength(2);
    expect(response.body.summary.priorities).toHaveLength(2);
  });

  it("generates a summary for clean code with no findings", async () => {
    const provider: ExplanationProvider = {
      generate: async () => JSON.stringify({
        summary: "No issues were detected in this code sample.",
        keyRisks: [],
        priorities: ["Continue following current code quality practices"],
        caveats: "Static analysis has limitations and cannot verify runtime behavior or complete security."
      })
    };

    const response = await request(apiWith(provider))
      .post("/api/review-summary")
      .send({ language: "typescript", filename: "clean.ts", analysisResult: emptyAnalysisResult });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.keyRisks).toHaveLength(0);
  });

  it("returns a safe error when no Gemini API key is configured", async () => {
    const response = await request(apiWith(new GeminiExplanationProvider("")))
      .post("/api/review-summary")
      .send(validRequest);

    expect(response.status).toBe(503);
    expect(response.body.error).toContain("not configured");
  });

  it.each(["provider failure", "timeout"])("returns a safe unavailable response for %s", async (reason) => {
    const provider: ExplanationProvider = {
      generate: async () => { throw new ExplanationProviderError(reason); }
    };

    const response = await request(apiWith(provider)).post("/api/review-summary").send(validRequest);

    expect(response.status).toBe(503);
    expect(response.body.error).toContain("currently unavailable");
  });

  it("rejects invalid requests before contacting the provider", async () => {
    const provider: ExplanationProvider = {
      generate: async () => { throw new Error("should not be called"); }
    };

    const response = await request(apiWith(provider))
      .post("/api/review-summary")
      .send({ language: "python", analysisResult: {} });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects requests with missing analysisResult", async () => {
    const provider: ExplanationProvider = {
      generate: async () => { throw new Error("should not be called"); }
    };

    const response = await request(apiWith(provider))
      .post("/api/review-summary")
      .send({ language: "javascript" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("valid analysis result");
  });

  it("rejects requests with excessive findings count", async () => {
    const provider: ExplanationProvider = {
      generate: async () => { throw new Error("should not be called"); }
    };

    const manyFindings = Array.from({ length: 201 }, (_, i) => ({
      type: "error" as const,
      severity: "low" as const,
      line: i + 1,
      message: `Error ${i}`,
      ruleId: `rule-${i}`
    }));

    const response = await request(apiWith(provider))
      .post("/api/review-summary")
      .send({
        language: "javascript",
        analysisResult: { ...validAnalysisResult, findings: manyFindings }
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("maximum count");
  });

  it("rejects malformed model output", async () => {
    const provider: ExplanationProvider = { generate: async () => "not json" };

    const response = await request(apiWith(provider)).post("/api/review-summary").send(validRequest);

    expect(response.status).toBe(502);
    expect(response.body.error).toContain("invalid response");
  });

  it("rejects incomplete model output", async () => {
    const provider: ExplanationProvider = {
      generate: async () => JSON.stringify({ summary: "incomplete" })
    };

    const response = await request(apiWith(provider)).post("/api/review-summary").send(validRequest);

    expect(response.status).toBe(502);
    expect(response.body.error).toContain("invalid response");
  });
});

describe("ReviewSummaryService", () => {
  it("preserves the original analysis result without modification", async () => {
    const provider: ExplanationProvider = {
      generate: async () => JSON.stringify({
        summary: "Test summary",
        keyRisks: ["Risk 1"],
        priorities: ["Priority 1"],
        caveats: "Test caveat"
      })
    };

    const originalResult = JSON.parse(JSON.stringify(validAnalysisResult));
    await new ReviewSummaryService(provider).generateSummary({
      language: "javascript",
      analysisResult: validAnalysisResult
    });

    expect(validAnalysisResult).toEqual(originalResult);
  });
});
