import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding, Severity } from "../types/analysis";

interface BracketToken {
  char: string;
  line: number;
}

/**
 * Masks string literals, char literals, and comments (line // and block /* ... *\/)
 * with spaces to preserve original line numbers and column offsets.
 */
function maskStringsAndComments(code: string): { maskedLines: string[]; rawLines: string[] } {
  const rawLines = code.split(/\r?\n/);
  const maskedLines: string[] = [];
  let inBlockComment = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let result = "";
    let j = 0;

    while (j < line.length) {
      if (inBlockComment) {
        const endIdx = line.indexOf("*/", j);
        if (endIdx === -1) {
          result += " ".repeat(line.length - j);
          j = line.length;
        } else {
          result += " ".repeat(endIdx + 2 - j);
          j = endIdx + 2;
          inBlockComment = false;
        }
        continue;
      }

      // Check block comment start
      if (line.slice(j, j + 2) === "/*") {
        const endIdx = line.indexOf("*/", j + 2);
        if (endIdx === -1) {
          result += " ".repeat(line.length - j);
          j = line.length;
          inBlockComment = true;
        } else {
          result += " ".repeat(endIdx + 2 - j);
          j = endIdx + 2;
        }
        continue;
      }

      // Check line comment
      if (line.slice(j, j + 2) === "//") {
        result += " ".repeat(line.length - j);
        j = line.length;
        break;
      }

      // Strings
      if (line[j] === '"' || line[j] === "'") {
        const quote = line[j];
        let k = j + 1;
        while (k < line.length && line[k] !== quote) {
          if (line[k] === "\\") k += 2;
          else k++;
        }
        const end = Math.min(k + 1, line.length);
        result += " ".repeat(end - j);
        j = end;
        continue;
      }

      result += line[j];
      j++;
    }

    maskedLines.push(result);
  }

  return { maskedLines, rawLines };
}

export class JavaErrorAnalyzer implements Analyzer {
  async analyze(input: AnalysisInput): Promise<Finding[]> {
    if (input.language !== "java") {
      return [];
    }

    const findings: Finding[] = [];
    const seen = new Set<string>();

    const addFinding = (
      line: number,
      severity: Severity,
      ruleId: string,
      message: string,
      suggestion?: string
    ) => {
      const key = `${line}:${ruleId}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          type: "error",
          severity,
          line,
          ruleId,
          message,
          suggestion
        });
      }
    };

    const { maskedLines, rawLines } = maskStringsAndComments(input.code);
    const bracketStack: BracketToken[] = [];
    const matchingClose: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

    let hasClassDefinition = false;
    let hasAnyCode = false;

    // First pass: check for class definition
    for (let idx = 0; idx < maskedLines.length; idx++) {
      const masked = maskedLines[idx];
      if (/\b(?:class|interface|enum|record)\s+[A-Za-z_]/.test(masked)) {
        hasClassDefinition = true;
      }
      if (masked.trim().length > 0) {
        hasAnyCode = true;
      }
    }

    if (hasAnyCode && !hasClassDefinition) {
      addFinding(
        1,
        "high",
        "java-missing-class",
        "Java code must be enclosed within a class or interface.",
        "Declare a class: 'public class Main { ... }'."
      );
    }

    // Line-by-line checks
    for (let idx = 0; idx < maskedLines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = rawLines[idx];
      const masked = maskedLines[idx];
      const trimmed = masked.trim();

      if (trimmed.length === 0) continue;

      // Track brackets
      for (let c = 0; c < masked.length; c++) {
        const char = masked[c];
        if (char === "{" || char === "(" || char === "[") {
          bracketStack.push({ char, line: lineNum });
        } else if (char === "}" || char === ")" || char === "]") {
          const expected = matchingClose[char];
          const last = bracketStack.pop();
          if (!last || last.char !== expected) {
            addFinding(
              lineNum,
              "high",
              "java-unmatched-brackets",
              `SyntaxError: unmatched closing '${char}'.`,
              "Ensure all brackets, braces, and parentheses are properly matched."
            );
          }
        }
      }

      // Check class naming convention (UpperCamelCase)
      const classMatch = /\bclass\s+([a-z][A-Za-z0-9_]*)/.exec(masked);
      if (classMatch) {
        addFinding(
          lineNum,
          "low",
          "java-naming-convention",
          `Class name '${classMatch[1]}' should start with an uppercase letter following Java conventions.`,
          `Rename class '${classMatch[1]}' to '${classMatch[1].charAt(0).toUpperCase() + classMatch[1].slice(1)}'.`
        );
      }

      // String comparison with ==
      if (
        /\b[a-zA-Z_]\w*\s*==\s*"(?:[^"\\]|\\.)*"/.test(rawLine) ||
        /"(?:[^"\\]|\\.)*"\s*==\s*[a-zA-Z_]\w*/.test(rawLine)
      ) {
        addFinding(
          lineNum,
          "high",
          "java-string-equality-with-operator",
          "String comparison using '==' checks object reference identity, not string content.",
          "Use '.equals()' or 'Objects.equals(a, b)' instead of '=='."
        );
      }

      // Empty catch block
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(masked)) {
        addFinding(
          lineNum,
          "medium",
          "java-empty-catch-block",
          "Empty catch block silently suppresses exceptions.",
          "Handle or log the caught exception."
        );
      }

      // Generic exception catch
      if (/catch\s*\(\s*(?:Throwable|Exception)\s+\w+\s*\)/.test(masked)) {
        addFinding(
          lineNum,
          "medium",
          "java-catch-generic-exception",
          "Catching overly broad 'Throwable' or 'Exception' can hide unexpected runtime failures.",
          "Catch more specific exceptions (e.g. IOException, IllegalArgumentException)."
        );
      }

      // System.out / System.err in code
      if (/\bSystem\.(?:out|err)\.print(?:ln|f)?\s*\(/.test(masked)) {
        addFinding(
          lineNum,
          "medium",
          "java-system-out-println",
          "Direct call to System.out/System.err detected in code.",
          "Consider using a production logging framework (SLF4J, Logback, etc.)."
        );
      }

      // Unclosed resource
      if (
        /\bnew\s+(?:FileInputStream|FileOutputStream|FileReader|FileWriter|Scanner|BufferedReader|BufferedWriter)\s*\(/.test(
          masked
        )
      ) {
        // Check if inside a try header: try (Resource r = ...)
        const isTryWithResources = /try\s*\(/.test(masked);
        if (!isTryWithResources) {
          addFinding(
            lineNum,
            "medium",
            "java-unclosed-resource",
            "Resource opened without try-with-resources may leak underlying OS descriptors.",
            "Wrap resource creation in a try-with-resources statement: 'try (var resource = ...) { ... }'."
          );
        }
      }

      // Check missing semicolon ';' on statement lines
      const needsSemicolon =
        /^(?:package|import|return|throw|break|continue)\b/.test(trimmed) ||
        // Variable declaration, assignment, method invocation, e.g. int x = 5, System.out.println("x")
        /(?:=|(?:\b(?:int|long|double|float|boolean|char|byte|short|String|var|[A-Z]\w*(?:<[^>]+>)?(?:\[\])?)\s+[a-zA-Z_]\w*)|(?:\b[a-zA-Z_]\w*\s*\([^)]*\)))/.test(
          trimmed
        );

      const isNonStatement =
        trimmed.startsWith("@") ||
        trimmed.endsWith("{") ||
        trimmed.endsWith("}") ||
        trimmed.endsWith(";") ||
        trimmed.endsWith(",") ||
        trimmed.endsWith(":") ||
        trimmed.endsWith("->") ||
        trimmed.endsWith("+") ||
        trimmed.endsWith("(") ||
        /^(?:public|private|protected|static|final|abstract|class|interface|enum|record)\b/.test(trimmed) ||
        /^(?:if|else|for|while|do|try|catch|finally|switch|case|default)\b/.test(trimmed);

      if (needsSemicolon && !isNonStatement) {
        addFinding(
          lineNum,
          "high",
          "java-missing-semicolon",
          "SyntaxError: missing semicolon ';' at the end of statement.",
          "Add ';' to terminate the statement."
        );
      }

      // Unreachable code after return / throw / break / continue
      if (/^(?:return\b|throw\b|break\b|continue\b)[^;]*;/.test(trimmed)) {
        const nextIdx = idx + 1;
        if (nextIdx < maskedLines.length) {
          const nextTrimmed = maskedLines[nextIdx].trim();
          if (nextTrimmed.length > 0 && !nextTrimmed.startsWith("}") && !nextTrimmed.startsWith("case ") && !nextTrimmed.startsWith("default:")) {
            addFinding(
              nextIdx + 1,
              "high",
              "java-unreachable-code",
              "Unreachable code detected after return/throw/break/continue statement.",
              "Remove or relocate unreachable code."
            );
          }
        }
      }
    }

    // Check unclosed brackets
    if (bracketStack.length > 0) {
      const unclosed = bracketStack[bracketStack.length - 1];
      addFinding(
        unclosed.line,
        "high",
        "java-unclosed-brackets",
        `SyntaxError: unclosed '${unclosed.char}' bracket.`,
        `Add matching closing bracket for '${unclosed.char}' opened on line ${unclosed.line}.`
      );
    }

    return findings;
  }
}
