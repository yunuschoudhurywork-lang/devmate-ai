import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding } from "../types/analysis";

const SUPPORTED_LANGUAGES = new Set(["javascript", "typescript", "python", "java"]);
const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

interface SecurityRule {
  ruleId: string;
  severity: "medium" | "high";
  message: string;
  suggestion: string;
  matches(line: string): boolean;
}

const SECURITY_RULES: SecurityRule[] = [
  {
    ruleId: "security-hardcoded-secret",
    severity: "high",
    message: "Potential hard-coded credential detected.",
    suggestion: "Move credentials to environment variables or a secret manager.",
    matches: (line) =>
      /\b(?:api[_-]?key|password|token|secret)\b\s*=\s*(['"])(?!\s*(?:example|replace|your|change)[^'"]*\1\s*;?\s*$)[^'"\r\n]+\1/i.test(
        line
      )
  },
  {
    ruleId: "security-eval",
    severity: "high",
    message: "Dynamic code execution or unsafe deserialization detected.",
    suggestion: "Avoid dynamic eval/exec and use safe serialization formats.",
    matches: (line) =>
      /(?<![\w$.])(?:eval|exec)\s*\(|\bScriptEngine\b.*\.eval\s*\(|\bpickle\s*\.\s*loads\s*\(/.test(line)
  },
  {
    ruleId: "security-command-exec",
    severity: "high",
    message: "Potentially dangerous command execution detected.",
    suggestion: "Validate input carefully and avoid executing untrusted commands.",
    matches: (line) =>
      /\bchild_process\s*\.\s*exec(?:Sync)?\s*\(|\bos\s*\.\s*(?:system|popen)\s*\(|\bsubprocess\s*\.\s*(?:run|Popen|call|check_output)\s*\(|\bRuntime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec\s*\(|\bnew\s+ProcessBuilder\s*\(/.test(
        line
      )
  },
  {
    ruleId: "security-http",
    severity: "medium",
    message: "Unencrypted HTTP URL detected.",
    suggestion: "Prefer HTTPS for network communication.",
    matches: (line) => {
      const match = /(['"])http:\/\/([^/'"\s]+)[^'"\s]*\1/i.exec(line);
      return match !== null && !LOCAL_HTTP_HOSTS.has(match[2].toLowerCase());
    }
  },
  {
    ruleId: "security-sql-injection",
    severity: "high",
    message: "Potential SQL injection vulnerability via string concatenation or interpolation.",
    suggestion: "Use parameterized queries or prepared statements instead of dynamic SQL strings.",
    matches: (line) =>
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+[^"'\r\n]*(?:['"]\s*\+|\+\s*['"]|f['"]|%\s*[a-zA-Z_]|\.format\()/i.test(line)
  }
];

/** A pattern-based security analyzer supporting JS, TS, Python, and Java. */
export class SecurityAnalyzer implements Analyzer {
  async analyze(input: AnalysisInput): Promise<Finding[]> {
    if (!SUPPORTED_LANGUAGES.has(input.language)) {
      return [];
    }

    const findings: Finding[] = [];
    const seen = new Set<string>();

    input.code.split(/\r?\n/).forEach((line, index) => {
      if (this.isCommentOnlyLine(line)) {
        return;
      }

      for (const rule of SECURITY_RULES) {
        const key = `${rule.ruleId}:${index + 1}`;
        if (rule.matches(line) && !seen.has(key)) {
          seen.add(key);
          findings.push({
            type: "security",
            severity: rule.severity,
            line: index + 1,
            message: rule.message,
            ruleId: rule.ruleId,
            suggestion: rule.suggestion
          });
        }
      }
    });

    return findings;
  }

  private isCommentOnlyLine(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed.startsWith("//") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    );
  }
}
