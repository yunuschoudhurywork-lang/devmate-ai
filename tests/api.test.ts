import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("DevMate AI API", () => {
  it("returns healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, status: "ok" });
  });

  it("analyzes valid JavaScript", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      filename: "example.js",
      code: "const message = 'Hello';\nconsole.log(message);"
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.analysis.language).toBe("javascript");
    expect(response.body.analysis.summary.total).toBe(0);
    expect(response.body.analysis.summary).toMatchObject({ errors: 0, warnings: 0, security: 0, performance: 0 });
    expect(response.body.analysis.quality).toEqual({
      overall: 100,
      categories: { correctness: 100, security: 100, performance: 100 }
    });
  });

  it("reports invalid JavaScript from ESLint", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const x = ;"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis.summary.errors).toBeGreaterThan(0);
    expect(response.body.analysis.findings[0]).toMatchObject({
      type: "error",
      ruleId: "eslint-parsing-error"
    });
  });

  it("reports undefined variables", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "console.log(undefinedVariable);"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "no-undef", severity: "high", line: 1 })])
    );
  });

  it("reports unused variables as warnings", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const unusedVariable = 10;"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "no-unused-vars", severity: "medium", line: 1 })])
    );
    expect(response.body.analysis.summary.warnings).toBeGreaterThan(0);
  });

  it("reports unreachable code", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "function run() { return; console.log('unreachable'); }"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: "no-unreachable", severity: "high" })])
    );
  });

  it("analyzes valid TypeScript", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "typescript",
      filename: "example.ts",
      code: "const message: string = 'Hello';\nconsole.log(message);"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis).toMatchObject({
      language: "typescript",
      findings: [],
      summary: { total: 0, errors: 0, warnings: 0, security: 0, performance: 0 }
    });
  });

  it("reports a hard-coded API key", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const apiKey = 'secret123';"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "security", ruleId: "security-hardcoded-secret", severity: "high" })])
    );
  });

  it("reports eval()", async () => {
    const response = await request(app).post("/api/analyze").send({ language: "javascript", code: "eval(userInput);" });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "security", ruleId: "security-eval", severity: "high" })])
    );
  });

  it("returns security and ESLint findings together", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const apiKey = 'secret123'; eval(input);"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "security", ruleId: "security-hardcoded-secret", severity: "high" }),
        expect.objectContaining({ type: "security", ruleId: "security-eval", severity: "high" }),
        expect.objectContaining({ type: "error", ruleId: "no-unused-vars" }),
        expect.objectContaining({ type: "error", ruleId: "no-undef" })
      ])
    );
    expect(response.body.analysis.summary.security).toBe(2);
  });

  it("reports child_process.exec()", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "child_process.exec(command);"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "security", ruleId: "security-command-exec", severity: "high" })])
    );
  });

  it("reports hard-coded HTTP URLs", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const endpoint = 'http://example.com/api';"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "security", ruleId: "security-http", severity: "medium" })])
    );
  });

  it("returns zero security findings for safe code", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const endpoint = 'https://example.com/api';\nconsole.log(endpoint);"
    });

    expect(response.status).toBe(200);
    expect(response.body.analysis.summary.security).toBe(0);
  });

  it("reports multiple security issues in one file", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const token = 'secure-token-value';\neval(userInput);\nchild_process.exec(command);\nfetch('http://example.com');"
    });

    expect(response.body.analysis.summary.security).toBe(4);
  });

  it("reports nested loops as a potential performance issue", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "for (const user of users) {\n  for (const order of orders) {\n    console.log(user, order);\n  }\n}"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "performance", ruleId: "performance-nested-loop", severity: "medium" })])
    );
  });

  it("does not report a single loop as a performance finding", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "for (const item of items) {\n  console.log(item);\n}"
    });

    expect(response.body.analysis.summary.performance).toBe(0);
  });

  it("reports repeated array searches inside a loop", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "for (const item of items) {\n  if (allowedIds.includes(item.id)) {\n    console.log(item);\n  }\n}"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "performance", ruleId: "performance-repeated-search", severity: "medium" })])
    );
  });

  it("reports repeated deterministic computations inside a loop", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "for (const item of items) {\n  const first = Math.floor(item.value);\n  const second = Math.floor(item.value);\n  console.log(first, second);\n}"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "performance", ruleId: "performance-repeated-computation", severity: "low" })])
    );
  });

  it("returns zero performance findings for safe code", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const message = 'Hello';\nconsole.log(message);"
    });

    expect(response.body.analysis.summary.performance).toBe(0);
  });

  it("returns error, security, and performance findings together", async () => {
    const response = await request(app).post("/api/analyze").send({
      language: "javascript",
      code: "const apiKey = 'secret123';\nfor (const item of items) {\n  for (const match of matches) {\n    eval(input);\n  }\n}"
    });

    expect(response.body.analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "error", ruleId: "no-undef" }),
        expect.objectContaining({ type: "security", ruleId: "security-hardcoded-secret" }),
        expect.objectContaining({ type: "security", ruleId: "security-eval" }),
        expect.objectContaining({ type: "performance", ruleId: "performance-nested-loop" })
      ])
    );
    expect(response.body.analysis.summary).toMatchObject({ security: 2, performance: 1 });
    expect(response.body.analysis.quality.categories).toMatchObject({
      correctness: expect.any(Number),
      security: expect.any(Number),
      performance: expect.any(Number)
    });
  });

  it("rejects unsupported languages", async () => {
    const response = await request(app).post("/api/analyze").send({ language: "python", code: "print('hi')" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects a missing code field", async () => {
    const response = await request(app).post("/api/analyze").send({ language: "javascript" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("code");
  });
});
