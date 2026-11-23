import { describe, expect, it } from "vitest";
import { runStaticHeuristics, calculateQualityScore } from "./staticHeuristics";

describe("staticHeuristics", () => {
  it("detects hardcoded credentials and secret tokens", () => {
    const code = `const apiKey = "sk_live_123456789abcdef";\nconst normal = "hello";`;
    const result = runStaticHeuristics({
      code,
      language: "javascript"
    });

    const secretFinding = result.findings.find((f) => f.ruleId === "security-hardcoded-secret");
    expect(secretFinding).toBeDefined();
    expect(secretFinding?.line).toBe(1);
    expect(secretFinding?.severity).toBe("high");
    expect(result.summary.security).toBeGreaterThan(0);
    expect(result.quality.categories.security).toBeLessThan(100);
  });

  it("detects dangerous eval execution", () => {
    const code = `const userCode = "2 + 2";\neval(userCode);`;
    const result = runStaticHeuristics({
      code,
      language: "typescript"
    });

    const evalFinding = result.findings.find((f) => f.ruleId === "security-eval");
    expect(evalFinding).toBeDefined();
    expect(evalFinding?.line).toBe(2);
  });

  it("detects command execution and unsafe subprocess calls", () => {
    const code = `import os\nos.system("rm -rf " + user_input)`;
    const result = runStaticHeuristics({
      code,
      language: "python"
    });

    const execFinding = result.findings.find((f) => f.ruleId === "security-command-exec");
    expect(execFinding).toBeDefined();
  });

  it("detects unencrypted HTTP requests excluding localhost", () => {
    const code = `const url = "http://api.insecure.com/data";\nconst local = "http://localhost:3000";`;
    const result = runStaticHeuristics({
      code,
      language: "javascript"
    });

    const httpFindings = result.findings.filter((f) => f.ruleId === "security-http");
    expect(httpFindings.length).toBe(1);
    expect(httpFindings[0].line).toBe(1);
  });

  it("detects potential SQL injection via string concatenation", () => {
    const code = `const query = "SELECT * FROM users WHERE id = " + userId;`;
    const result = runStaticHeuristics({
      code,
      language: "javascript"
    });

    const sqlFinding = result.findings.find((f) => f.ruleId === "security-sql-injection");
    expect(sqlFinding).toBeDefined();
  });

  it("detects syntax errors like unbalanced or unclosed delimiters", () => {
    const code = `function calculate() {\n  const x = [1, 2, 3;\n  return x;\n}`;
    const result = runStaticHeuristics({
      code,
      language: "javascript"
    });

    const delimiterFinding = result.findings.find((f) => f.ruleId.startsWith("syntax-"));
    expect(delimiterFinding).toBeDefined();
    expect(result.summary.errors).toBeGreaterThan(0);
  });

  it("detects performance nested loops and repeated collection searches", () => {
    const code = `for (let i = 0; i < items.length; i++) {\n  for (let j = 0; j < items.length; j++) {\n    if (items.includes(j)) {\n      console.log(i, j);\n    }\n  }\n}`;
    const result = runStaticHeuristics({
      code,
      language: "javascript"
    });

    const nestedLoopFinding = result.findings.find((f) => f.ruleId === "performance-nested-loop");
    const repeatedSearchFinding = result.findings.find((f) => f.ruleId === "performance-repeated-search");

    expect(nestedLoopFinding).toBeDefined();
    expect(repeatedSearchFinding).toBeDefined();
    expect(result.summary.performance).toBeGreaterThan(0);
    expect(result.quality.categories.performance).toBeLessThan(100);
  });

  it("computes 100 quality score for clean code", () => {
    const code = `function add(a: number, b: number): number {\n  return a + b;\n}`;
    const result = runStaticHeuristics({
      code,
      language: "typescript"
    });

    expect(result.findings).toHaveLength(0);
    expect(result.quality.overall).toBe(100);
    expect(result.quality.categories.correctness).toBe(100);
    expect(result.quality.categories.security).toBe(100);
    expect(result.quality.categories.performance).toBe(100);
  });
});
