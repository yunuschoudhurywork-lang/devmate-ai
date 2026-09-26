import type { Finding, QualityScore, Severity } from "../types/analysis";

type ScoreCategory = "correctness" | "security" | "performance";

/** Centralized, deterministic category weights for the overall quality score. */
const CATEGORY_WEIGHTS: Record<ScoreCategory, number> = {
  correctness: 0.4,
  security: 0.35,
  performance: 0.25
};

const DEDUCTIONS: Record<ScoreCategory, Partial<Record<Severity, number>>> = {
  correctness: { high: 15, medium: 8, low: 3 },
  security: { critical: 25, high: 15, medium: 8, low: 3 },
  performance: { high: 10, medium: 6, low: 2 }
};

const FINDING_CATEGORY: Record<Finding["type"], ScoreCategory> = {
  error: "correctness",
  security: "security",
  performance: "performance"
};

/** Calculates a quality score from normalized analyzer findings only. */
export class QualityScoreEngine {
  calculate(findings: Finding[]): QualityScore {
    const categories: Record<ScoreCategory, number> = {
      correctness: 100,
      security: 100,
      performance: 100
    };

    for (const finding of findings) {
      const category = FINDING_CATEGORY[finding.type];
      categories[category] = this.clamp(categories[category] - this.deductionFor(category, finding.severity));
    }

    const overall = Math.round(
      categories.correctness * CATEGORY_WEIGHTS.correctness +
        categories.security * CATEGORY_WEIGHTS.security +
        categories.performance * CATEGORY_WEIGHTS.performance
    );

    return { overall, categories };
  }

  private deductionFor(category: ScoreCategory, severity: Severity): number {
    const configuredDeduction = DEDUCTIONS[category][severity];
    if (configuredDeduction !== undefined) {
      return configuredDeduction;
    }

    // Current correctness and performance analyzers do not emit critical findings.
    // If one does in the future, use that category's strongest documented deduction.
    return Math.max(...Object.values(DEDUCTIONS[category]));
  }

  private clamp(score: number): number {
    return Math.max(0, Math.min(100, score));
  }
}
