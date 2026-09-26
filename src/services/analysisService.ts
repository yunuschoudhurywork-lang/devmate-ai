import { ErrorAnalyzer } from "../analyzers/errorAnalyzer";
import { SecurityAnalyzer } from "../analyzers/securityAnalyzer";
import { PerformanceAnalyzer } from "../analyzers/performanceAnalyzer";
import { QualityScoreEngine } from "./qualityScoreEngine";
import type { Analyzer } from "../analyzers/analyzer";
import type { AnalysisInput, AnalysisResult } from "../types/analysis";

export class AnalysisService {
  constructor(
    private readonly analyzers: Analyzer[] = [new ErrorAnalyzer(), new SecurityAnalyzer(), new PerformanceAnalyzer()],
    private readonly qualityScoreEngine = new QualityScoreEngine()
  ) {}

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const findings = (await Promise.all(this.analyzers.map((analyzer) => analyzer.analyze(input)))).flat();

    return {
      language: input.language,
      findings,
      summary: {
        total: findings.length,
        errors: findings.filter(
          (finding) => finding.type === "error" && (finding.severity === "high" || finding.severity === "critical")
        ).length,
        warnings: findings.filter(
          (finding) => finding.type === "error" && (finding.severity === "low" || finding.severity === "medium")
        ).length,
        security: findings.filter((finding) => finding.type === "security").length,
        performance: findings.filter((finding) => finding.type === "performance").length
      },
      quality: this.qualityScoreEngine.calculate(findings)
    };
  }
}
