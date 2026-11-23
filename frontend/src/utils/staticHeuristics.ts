import type { AnalysisInput, AnalysisResult, Finding, QualityScore, Severity } from "@/types/analysis";

type ScoreCategory = "correctness" | "security" | "performance";

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

const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);
const BRACE_LOOP_PATTERN = /\b(?:for|while)\s*\([^)]*\)\s*\{?/;
const SEARCH_PATTERN = /\b[A-Za-z_$][\w$]*\s*\.\s*(?:find|includes|indexOf|contains)\s*\(/;
const DETERMINISTIC_CALL_PATTERN =
  /\b(?:Math\.(?:abs|ceil|floor|max|min|round)|JSON\.stringify|Object\.keys|math\.(?:sqrt|floor|ceil|pow)|Math\.(?:sqrt|pow))\s*\([^;\n]+\)/g;

interface HeuristicRule {
  ruleId: string;
  type: "error" | "security" | "performance";
  severity: Severity;
  message: string;
  suggestion: string;
  matches: (line: string, index: number, lines: string[]) => boolean;
}

const STATIC_SECURITY_RULES: HeuristicRule[] = [
  {
    ruleId: "security-hardcoded-secret",
    type: "security",
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
    type: "security",
    severity: "high",
    message: "Dynamic code execution or unsafe deserialization detected.",
    suggestion: "Avoid dynamic eval/exec and use safe serialization formats.",
    matches: (line) =>
      /(?<![\w$.])(?:eval|exec)\s*\(|\bScriptEngine\b.*\.eval\s*\(|\bpickle\s*\.\s*loads\s*\(/.test(line)
  },
  {
    ruleId: "security-command-exec",
    type: "security",
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
    type: "security",
    severity: "medium",
    message: "Unencrypted HTTP URL detected.",
    suggestion: "Prefer HTTPS for network communication.",
    matches: (line) => {
      const match = /(['"])http:\/\/([^/'":\s]+)[^'"\s]*\1/i.exec(line);
      return match !== null && !LOCAL_HTTP_HOSTS.has(match[2].toLowerCase());
    }
  },
  {
    ruleId: "security-sql-injection",
    type: "security",
    severity: "high",
    message: "Potential SQL injection vulnerability via dynamic string concatenation.",
    suggestion: "Use parameterized queries or prepared statements instead of dynamic SQL strings.",
    matches: (line) =>
      /(?:SELECT|INSERT|UPDATE|DELETE)\s+[^"'\r\n]*(?:['"]\s*\+|\+\s*['"]|f['"]|%\s*[a-zA-Z_]|\.format\()/i.test(line)
  }
];

const STATIC_CORRECTNESS_RULES: HeuristicRule[] = [
  {
    ruleId: "no-debugger",
    type: "error",
    severity: "medium",
    message: "Unexpected 'debugger' statement.",
    suggestion: "Remove debug statements prior to running in production.",
    matches: (line) => /^\s*debugger\s*;?$/.test(line)
  },
  {
    ruleId: "correctness-empty-catch",
    type: "error",
    severity: "medium",
    message: "Empty catch block silently swallowing exceptions.",
    suggestion: "Handle or log the caught error instead of discarding it.",
    matches: (line) => /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(line)
  },
  {
    ruleId: "correctness-constant-condition",
    type: "error",
    severity: "medium",
    message: "Unexpected constant condition in conditional expression.",
    suggestion: "Check whether a dynamic variable or expression was intended.",
    matches: (line) => /\b(?:if|while)\s*\(\s*(?:true|false|1|0)\s*\)/.test(line)
  }
];

function isCommentOnly(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("#") ||
    (trimmed.startsWith("<!--") && trimmed.endsWith("-->"))
  );
}

function checkDelimiters(code: string): Finding[] {
  const findings: Finding[] = [];
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const matchingOpen: Record<string, string> = { ")": "(", "}": "{", "]": "[" };

  const lines = code.split(/\r?\n/);
  let inString: string | null = null;
  let inMultiComment = false;

  lines.forEach((line, lineIdx) => {
    const lineNum = lineIdx + 1;
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const prevChar = col > 0 ? line[col - 1] : "";

      if (inMultiComment) {
        if (prevChar === "*" && char === "/") inMultiComment = false;
        continue;
      }

      if (inString) {
        if (char === inString && prevChar !== "\\") inString = null;
        continue;
      }

      if (char === "/" && line[col + 1] === "/") break; // rest of line is line comment
      if (char === "/" && line[col + 1] === "*") {
        inMultiComment = true;
        col++;
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        inString = char;
        continue;
      }

      if (char === "(" || char === "{" || char === "[") {
        stack.push({ char, line: lineNum });
      } else if (char === ")" || char === "}" || char === "]") {
        if (stack.length === 0) {
          findings.push({
            type: "error",
            severity: "high",
            line: lineNum,
            ruleId: "syntax-unbalanced-delimiters",
            message: `Unmatched closing delimiter '${char}'.`,
            suggestion: `Remove or balance the closing '${char}'.`
          });
        } else {
          const top = stack.pop()!;
          if (top.char !== matchingOpen[char]) {
            findings.push({
              type: "error",
              severity: "high",
              line: lineNum,
              ruleId: "syntax-unbalanced-delimiters",
              message: `Mismatched delimiters: opened with '${top.char}' on line ${top.line} but closed with '${char}'.`,
              suggestion: `Close '${top.char}' with '${pairs[top.char]}' instead of '${char}'.`
            });
          }
        }
      }
    }
  });

  // Remaining unclosed delimiters in stack
  for (const unclosed of stack.slice(-3)) {
    findings.push({
      type: "error",
      severity: "high",
      line: unclosed.line,
      ruleId: "syntax-unclosed-delimiter",
      message: `Unclosed delimiter '${unclosed.char}'.`,
      suggestion: `Add matching '${pairs[unclosed.char]}' to close the delimiter.`
    });
  }

  return findings;
}

function analyzePerformance(code: string, language: string): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const lines = code.split(/\r?\n/);

  interface LoopContext {
    endDepth: number;
    computations: Set<string>;
  }
  const loops: LoopContext[] = [];
  let depth = 0;

  lines.forEach((line, index) => {
    if (isCommentOnly(line)) return;
    const lineNum = index + 1;

    while (loops.length > 0 && depth < loops[loops.length - 1].endDepth) {
      loops.pop();
    }

    const isLoop = language === "python" ? /^\s*(?:for|while)\b.*:/.test(line) : BRACE_LOOP_PATTERN.test(line);

    if (isLoop && loops.length > 0) {
      const key = `nested-loop:${lineNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          type: "performance",
          severity: "medium",
          line: lineNum,
          ruleId: "performance-nested-loop",
          message: "Potential nested-loop performance issue detected.",
          suggestion: "Review whether the nested iteration can be replaced with a more efficient lookup structure (Set/Map)."
        });
      }
    }

    if (loops.length > 0 && SEARCH_PATTERN.test(line)) {
      const key = `repeated-search:${lineNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          type: "performance",
          severity: "medium",
          line: lineNum,
          ruleId: "performance-repeated-search",
          message: "Potential repeated collection search inside a loop detected.",
          suggestion: "Consider precomputing a Set or Map outside the loop for O(1) lookups."
        });
      }
    }

    const activeLoop = loops[loops.length - 1];
    if (activeLoop) {
      const matches = line.match(DETERMINISTIC_CALL_PATTERN) ?? [];
      for (const expr of matches) {
        const normalized = expr.replace(/\s+/g, "");
        if (activeLoop.computations.has(normalized)) {
          const key = `repeated-calc:${lineNum}:${normalized}`;
          if (!seen.has(key)) {
            seen.add(key);
            findings.push({
              type: "performance",
              severity: "low",
              line: lineNum,
              ruleId: "performance-repeated-computation",
              message: `Potential repeated deterministic computation '${expr}' inside a loop.`,
              suggestion: "Hoist computation outside the loop or cache its result."
            });
          }
        }
        activeLoop.computations.add(normalized);
      }
    }

    if (language !== "python") {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const delta = openBraces - closeBraces;

      if (isLoop) {
        loops.push({ endDepth: depth + Math.max(delta, 1), computations: new Set() });
      }
      depth = Math.max(0, depth + delta);
    } else {
      if (isLoop) {
        loops.push({ endDepth: 1, computations: new Set() });
      }
    }
  });

  return findings;
}

export function calculateQualityScore(findings: Finding[]): QualityScore {
  const categories: Record<ScoreCategory, number> = {
    correctness: 100,
    security: 100,
    performance: 100
  };

  for (const finding of findings) {
    const category = FINDING_CATEGORY[finding.type];
    const deduction = DEDUCTIONS[category][finding.severity] ?? 10;
    categories[category] = Math.max(0, Math.min(100, categories[category] - deduction));
  }

  const overall = Math.round(
    categories.correctness * CATEGORY_WEIGHTS.correctness +
      categories.security * CATEGORY_WEIGHTS.security +
      categories.performance * CATEGORY_WEIGHTS.performance
  );

  return { overall, categories };
}

export function runStaticHeuristics(input: AnalysisInput): AnalysisResult {
  const findings: Finding[] = [];
  const lines = input.code.split(/\r?\n/);
  const seen = new Set<string>();

  // 1. Line-by-line checks for Security and Correctness
  lines.forEach((line, index) => {
    if (isCommentOnly(line)) return;
    const lineNum = index + 1;

    for (const rule of [...STATIC_SECURITY_RULES, ...STATIC_CORRECTNESS_RULES]) {
      const key = `${rule.ruleId}:${lineNum}`;
      if (!seen.has(key) && rule.matches(line, index, lines)) {
        seen.add(key);
        findings.push({
          type: rule.type,
          severity: rule.severity,
          line: lineNum,
          ruleId: rule.ruleId,
          message: rule.message,
          suggestion: rule.suggestion
        });
      }
    }
  });

  // 2. Structural checks: Delimiter balance
  const delimiterFindings = checkDelimiters(input.code);
  for (const df of delimiterFindings) {
    const key = `${df.ruleId}:${df.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push(df);
    }
  }

  // 3. Performance analysis (loops, hoistable calls, nested iterations)
  const perfFindings = analyzePerformance(input.code, input.language);
  for (const pf of perfFindings) {
    const key = `${pf.ruleId}:${pf.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push(pf);
    }
  }

  // Sort findings by line number
  findings.sort((a, b) => a.line - b.line);

  const quality = calculateQualityScore(findings);

  return {
    language: input.language,
    findings,
    summary: {
      total: findings.length,
      errors: findings.filter((f) => f.type === "error" && (f.severity === "high" || f.severity === "critical")).length,
      warnings: findings.filter((f) => f.type === "error" && (f.severity === "low" || f.severity === "medium")).length,
      security: findings.filter((f) => f.type === "security").length,
      performance: findings.filter((f) => f.type === "performance").length
    },
    quality
  };
}
