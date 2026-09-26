import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding } from "../types/analysis";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript"]);
const LOOP_PATTERN = /\b(?:for|while)\s*\([^)]*\)\s*\{/;
const ARRAY_SEARCH_PATTERN = /\b[A-Za-z_$][\w$]*\s*\.\s*(?:find|includes|indexOf)\s*\(/;
const DETERMINISTIC_CALL_PATTERN = /\b(?:Math\.(?:abs|ceil|floor|max|min|round)|JSON\.stringify|Object\.keys)\s*\([^;\n]+\)/g;

interface LoopContext {
  endDepth: number;
  computations: Set<string>;
}

/** A small, conservative pattern matcher for common loop-related performance concerns. */
export class PerformanceAnalyzer implements Analyzer {
  async analyze(input: AnalysisInput): Promise<Finding[]> {
    if (!SUPPORTED_LANGUAGES.has(input.language)) {
      return [];
    }

    const findings: Finding[] = [];
    const seen = new Set<string>();
    const loops: LoopContext[] = [];
    let depth = 0;

    input.code.split(/\r?\n/).forEach((line, index) => {
      const code = this.withoutCommentOnlyLines(line);
      if (code === null) {
        return;
      }

      while (loops.length > 0 && depth < loops[loops.length - 1].endDepth) {
        loops.pop();
      }

      const isLoop = LOOP_PATTERN.test(code);
      if (isLoop && loops.length > 0) {
        this.addFinding(findings, seen, index + 1, {
          ruleId: "performance-nested-loop",
          severity: "medium",
          message: "Potential nested-loop performance issue detected.",
          suggestion: "Review whether the nested iteration can be replaced with a more efficient lookup structure."
        });
      }

      if (loops.length > 0 && ARRAY_SEARCH_PATTERN.test(code)) {
        this.addFinding(findings, seen, index + 1, {
          ruleId: "performance-repeated-search",
          severity: "medium",
          message: "Potential repeated array search inside a loop detected.",
          suggestion: "Consider precomputing a Set or Map outside the loop for repeated lookups."
        });
      }

      const activeLoop = loops[loops.length - 1];
      if (activeLoop) {
        for (const expression of code.match(DETERMINISTIC_CALL_PATTERN) ?? []) {
          const normalized = expression.replace(/\s+/g, "");
          if (activeLoop.computations.has(normalized)) {
            this.addFinding(findings, seen, index + 1, {
              ruleId: "performance-repeated-computation",
              severity: "low",
              message: "Potential repeated deterministic computation inside a loop detected.",
              suggestion: "Compute the value once per iteration or move it outside the loop when possible."
            });
          }
          activeLoop.computations.add(normalized);
        }
      }

      const braceDelta = this.braceDelta(code);
      if (isLoop) {
        loops.push({ endDepth: depth + Math.max(braceDelta, 1), computations: new Set<string>() });
      }
      depth = Math.max(0, depth + braceDelta);
    });

    return findings;
  }

  private addFinding(
    findings: Finding[],
    seen: Set<string>,
    line: number,
    finding: Omit<Finding, "type" | "line">
  ): void {
    const key = `${finding.ruleId}:${line}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push({ ...finding, type: "performance", line });
    }
  }

  private withoutCommentOnlyLines(line: string): string | null {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*") ? null : line;
  }

  private braceDelta(line: string): number {
    return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
  }
}
