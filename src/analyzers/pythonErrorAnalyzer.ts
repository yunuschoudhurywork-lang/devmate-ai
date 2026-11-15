import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding, Severity } from "../types/analysis";

interface BracketToken {
  char: string;
  line: number;
}

const COMPOUND_STMT_START = /^(?:if|elif|else|for|while|def|class|try|except|finally|with|async\s+def|async\s+for|async\s+with)\b/;

/**
 * Replaces string literals and comments with spaces (preserving line/character positions),
 * while tracking multi-line quotes and docstrings.
 */
function maskStringsAndComments(code: string): { maskedLines: string[]; rawLines: string[] } {
  const rawLines = code.split(/\r?\n/);
  const maskedLines: string[] = [];
  let inMultiLineQuote: string | null = null; // '"""' or "'''"

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let result = "";
    let j = 0;

    while (j < line.length) {
      if (inMultiLineQuote) {
        const endIdx = line.indexOf(inMultiLineQuote, j);
        if (endIdx === -1) {
          result += " ".repeat(line.length - j);
          j = line.length;
        } else {
          result += " ".repeat(endIdx + inMultiLineQuote.length - j);
          j = endIdx + inMultiLineQuote.length;
          inMultiLineQuote = null;
        }
        continue;
      }

      // Check for start of multiline triple quotes
      if (line.slice(j, j + 3) === '"""' || line.slice(j, j + 3) === "'''") {
        const quote = line.slice(j, j + 3);
        const endIdx = line.indexOf(quote, j + 3);
        if (endIdx === -1) {
          result += " ".repeat(line.length - j);
          j = line.length;
          inMultiLineQuote = quote;
        } else {
          result += " ".repeat(endIdx + 3 - j);
          j = endIdx + 3;
        }
        continue;
      }

      // Check for comment
      if (line[j] === "#") {
        result += " ".repeat(line.length - j);
        j = line.length;
        break;
      }

      // Single-line strings
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

export class PythonErrorAnalyzer implements Analyzer {
  async analyze(input: AnalysisInput): Promise<Finding[]> {
    if (input.language !== "python") {
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

    let expectIndentAfterLine = -1;
    let previousIndent = 0;
    let insideCompoundHeader = false;
    let compoundHeaderStartLine = -1;

    for (let idx = 0; idx < maskedLines.length; idx++) {
      const lineNum = idx + 1;
      const rawLine = rawLines[idx];
      const masked = maskedLines[idx];
      const trimmed = masked.trim();
      const rawTrimmed = rawLine.trim();

      // Check for mixed tabs and spaces in indentation
      const leadingWhitespace = rawLine.match(/^[ \t]+/)?.[0] ?? "";
      if (leadingWhitespace.includes("\t") && leadingWhitespace.includes(" ")) {
        addFinding(
          lineNum,
          "high",
          "python-mixed-indentation",
          "Inconsistent indentation: mixed spaces and tabs detected.",
          "Use consistent spaces (recommended: 4 spaces per indent level)."
        );
      }

      const currentIndent = leadingWhitespace.replace(/\t/g, "    ").length;

      // Check if previous line expected an indented block
      if (expectIndentAfterLine !== -1 && trimmed.length > 0) {
        if (currentIndent <= previousIndent) {
          addFinding(
            lineNum,
            "high",
            "python-indentation-error",
            `IndentationError: expected an indented block after statement at line ${expectIndentAfterLine}.`,
            "Indent the body of the statement."
          );
        }
        expectIndentAfterLine = -1;
      }

      if (trimmed.length === 0) {
        continue;
      }

      // Check brackets
      for (let c = 0; c < masked.length; c++) {
        const char = masked[c];
        if (char === "(" || char === "[" || char === "{") {
          bracketStack.push({ char, line: lineNum });
        } else if (char === ")" || char === "]" || char === "}") {
          const expected = matchingClose[char];
          const last = bracketStack.pop();
          if (!last || last.char !== expected) {
            addFinding(
              lineNum,
              "high",
              "python-unmatched-brackets",
              `SyntaxError: unmatched closing '${char}'.`,
              "Verify opening and closing parentheses, brackets, and braces match."
            );
          }
        }
      }

      // Compound statement header colon check
      if (!insideCompoundHeader && COMPOUND_STMT_START.test(trimmed)) {
        insideCompoundHeader = true;
        compoundHeaderStartLine = lineNum;
      }

      if (insideCompoundHeader) {
        // If parentheses/brackets are closed and this line ends the header
        const openBracketsInStatement = bracketStack.filter((b) => b.line >= compoundHeaderStartLine).length;
        if (openBracketsInStatement === 0) {
          if (!trimmed.endsWith(":")) {
            addFinding(
              compoundHeaderStartLine,
              "high",
              "python-missing-colon",
              "SyntaxError: expected ':' at the end of statement.",
              "Add ':' at the end of the compound statement header."
            );
          } else {
            expectIndentAfterLine = lineNum;
            previousIndent = currentIndent;
          }
          insideCompoundHeader = false;
        }
      }

      // Invalid boolean / null literals (true, false, null)
      const invalidLiteralMatch = /\b(true|false|null)\b/.exec(masked);
      if (invalidLiteralMatch) {
        const invalid = invalidLiteralMatch[1];
        const correct = invalid === "true" ? "True" : invalid === "false" ? "False" : "None";
        addFinding(
          lineNum,
          "high",
          "python-invalid-boolean-literal",
          `NameError: '${invalid}' is not defined in Python. Did you mean '${correct}'?`,
          `Replace '${invalid}' with '${correct}'.`
        );
      }

      // Invalid logical operators (&&, ||, !var)
      if (/&&|\|\|/.test(masked)) {
        addFinding(
          lineNum,
          "high",
          "python-invalid-logical-operator",
          "SyntaxError: '&&' and '||' are not valid operators in Python.",
          "Use 'and' or 'or' instead."
        );
      }
      if (/(?<!\w)!(?!=)\s*[a-zA-Z_]/.test(masked)) {
        addFinding(
          lineNum,
          "high",
          "python-invalid-logical-operator",
          "SyntaxError: '!' is not a logical negation operator in Python.",
          "Use 'not' instead."
        );
      }

      // Invalid increment / decrement (++ or --)
      if (/\+\+|--/.test(masked)) {
        addFinding(
          lineNum,
          "high",
          "python-invalid-increment",
          "SyntaxError: '++' and '--' operators do not exist in Python.",
          "Use '+= 1' or '-= 1' instead."
        );
      }

      // Mutable default arguments: def foo(bar=[]):
      if (/def\s+\w+\s*\([^)]*=\s*(\[\]|\{\}|set\(\))/.test(masked)) {
        addFinding(
          lineNum,
          "medium",
          "python-mutable-default-arg",
          "Default argument value is mutable (list/dict/set), which can retain state across calls.",
          "Use 'None' as the default argument value and initialize the mutable object inside the function body."
        );
      }

      // Comparison with literal using 'is' (e.g. if x is 5 or if x is "str")
      if (/\bis\s+(?:['"]|\d+|True\b|False\b)/.test(rawLine) || /(?:['"]|\d+)\s+is\b/.test(rawLine)) {
        addFinding(
          lineNum,
          "medium",
          "python-is-literal-comparison",
          "Using 'is' for literal comparison checks identity instead of equality.",
          "Use '==' to compare literal values, and reserve 'is' for singleton checks like 'is None'."
        );
      }

      // Invalid property .length or .size()
      if (/\b\w+\s*\.\s*(?:length\b|size\s*\(\s*\))/.test(masked)) {
        addFinding(
          lineNum,
          "high",
          "python-invalid-len",
          "Python collections do not have a '.length' property or '.size()' method.",
          "Use 'len(obj)' to get the length of a collection or string in Python."
        );
      }

      // Bare except:
      if (/^\s*except\s*:/.test(masked)) {
        addFinding(
          lineNum,
          "medium",
          "python-bare-except",
          "Bare 'except:' catches all exceptions, including SystemExit and KeyboardInterrupt.",
          "Use 'except Exception:' to catch standard application errors."
        );
      }

      // Unreachable code after return / raise / break / continue
      if (/^(?:return\b|raise\b|break\b|continue\b)/.test(trimmed)) {
        const nextIdx = idx + 1;
        if (nextIdx < maskedLines.length) {
          const nextMasked = maskedLines[nextIdx].trim();
          const nextRaw = rawLines[nextIdx];
          const nextIndent = (nextRaw.match(/^[ \t]+/)?.[0] ?? "").replace(/\t/g, "    ").length;
          if (
            nextMasked.length > 0 &&
            nextIndent >= currentIndent &&
            !/^(?:elif\b|else\b|except\b|finally\b)/.test(nextMasked)
          ) {
            addFinding(
              nextIdx + 1,
              "high",
              "python-unreachable-code",
              "Unreachable code detected after return/raise/break/continue statement.",
              "Remove or restructure unreachable code."
            );
          }
        }
      }
    }

    // Check for unclosed brackets at end of file
    if (bracketStack.length > 0) {
      const unclosed = bracketStack[bracketStack.length - 1];
      addFinding(
        unclosed.line,
        "high",
        "python-unclosed-brackets",
        `SyntaxError: unclosed '${unclosed.char}' bracket.`,
        `Add matching closing bracket for '${unclosed.char}' opened on line ${unclosed.line}.`
      );
    }

    return findings;
  }
}
