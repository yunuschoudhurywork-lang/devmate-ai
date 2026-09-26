import { describe, expect, it } from "vitest";
import { QualityScoreEngine } from "../src/services/qualityScoreEngine";
import type { Finding, FindingType, Severity } from "../src/types/analysis";

const engine = new QualityScoreEngine();

function finding(type: FindingType, severity: Severity): Finding {
  return { type, severity, line: 1, message: "Test finding", ruleId: "test-rule" };
}

describe("QualityScoreEngine", () => {
  it("returns 100 for code with no findings", () => {
    expect(engine.calculate([])).toEqual({
      overall: 100,
      categories: { correctness: 100, security: 100, performance: 100 }
    });
  });

  it("deducts for one high correctness error", () => {
    expect(engine.calculate([finding("error", "high")])).toEqual({
      overall: 94,
      categories: { correctness: 85, security: 100, performance: 100 }
    });
  });

  it("deducts for one high security finding", () => {
    expect(engine.calculate([finding("security", "high")])).toEqual({
      overall: 95,
      categories: { correctness: 100, security: 85, performance: 100 }
    });
  });

  it("deducts for one medium performance finding", () => {
    expect(engine.calculate([finding("performance", "medium")])).toEqual({
      overall: 99,
      categories: { correctness: 100, security: 100, performance: 94 }
    });
  });

  it("combines deductions from multiple categories", () => {
    expect(engine.calculate([finding("error", "high"), finding("security", "medium"), finding("performance", "low")])).toEqual({
      overall: 91,
      categories: { correctness: 85, security: 92, performance: 98 }
    });
  });

  it("never lets category or overall scores fall below zero", () => {
    const findings = [
      ...Array.from({ length: 10 }, () => finding("error", "high")),
      ...Array.from({ length: 10 }, () => finding("security", "critical")),
      ...Array.from({ length: 10 }, () => finding("performance", "high"))
    ];

    expect(engine.calculate(findings)).toEqual({
      overall: 0,
      categories: { correctness: 0, security: 0, performance: 0 }
    });
  });
});
