import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding, Severity } from "../types/analysis";

interface BracketToken {
  char: string;
  line: number;
}

const COMPOUND_STMT_START = /^(?:if|elif|else|for|while|def|class|try|except|finally|with|async\s+def|async\s+for|async\s+with)\b/;

const PYTHON_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break",
  "class", "continue", "def", "del", "elif", "else", "except", "finally",
  "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
  "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"
]);

const PYTHON_BUILTINS = new Set([
  "abs", "all", "any", "ascii", "bin", "bool", "breakpoint", "bytearray", "bytes",
  "callable", "chr", "classmethod", "compile", "complex", "delattr", "dict", "dir",
  "divmod", "enumerate", "eval", "exec", "filter", "float", "format", "frozenset",
  "getattr", "globals", "hasattr", "hash", "help", "hex", "id", "input", "int",
  "isinstance", "issubclass", "iter", "len", "list", "locals", "map", "max",
  "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print",
  "property", "range", "repr", "reversed", "round", "set", "setattr", "slice",
  "sorted", "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip",
  "__import__", "__name__", "__doc__", "__package__", "__loader__", "__spec__",
  "__annotations__", "__builtins__", "__file__", "self", "cls", "args", "kwargs",
  // Standard exceptions
  "BaseException", "Exception", "ArithmeticError", "BufferError", "LookupError",
  "AssertionError", "AttributeError", "EOFError", "FloatingPointError", "GeneratorExit",
  "ImportError", "ModuleNotFoundError", "IndexError", "KeyError", "KeyboardInterrupt",
  "MemoryError", "NameError", "NotImplementedError", "OSError", "OverflowError",
  "RecursionError", "ReferenceError", "RuntimeError", "StopIteration", "StopAsyncIteration",
  "SyntaxError", "IndentationError", "TabError", "SystemError", "SystemExit", "TypeError",
  "UnboundLocalError", "UnicodeError", "ValueError", "ZeroDivisionError", "FileNotFoundError",
  "PermissionError", "TimeoutError"
]);

/**
 * Replaces string literals and comments with spaces (preserving line/character positions),
 * while tracking multi-line quotes and docstrings.
 * In f-strings, expressions inside {...} are preserved so identifiers can be analyzed.
 */
function maskStringsAndComments(code: string): { maskedLines: string[]; rawLines: string[] } {
  const rawLines = code.split(/\r?\n/);
  const maskedLines: string[] = [];
  let inMultiLineQuote: string | null = null;

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

      if (line[j] === "#") {
        result += " ".repeat(line.length - j);
        j = line.length;
        break;
      }

      // Check for Python string literal with optional prefixes (f, r, b, u, fr, rf, rb, br)
      // Only treat as prefix if preceded by start of line or non-word char
      const isStartOrSeparator = j === 0 || !/[a-zA-Z0-9_]/.test(line[j - 1]);
      if (isStartOrSeparator) {
        const strMatch = line.slice(j).match(/^(f|r|b|u|fr|rf|rb|br)?("""|'''|"|')/i);
        if (strMatch) {
          const prefix = strMatch[1] ?? "";
          const quote = strMatch[2];
          const isFString = prefix.toLowerCase().includes("f");
          const isTriple = quote.length === 3;
          const prefixLen = prefix.length;
          const quoteLen = quote.length;

          if (isTriple) {
            const endIdx = line.indexOf(quote, j + prefixLen + quoteLen);
            if (endIdx === -1) {
              result += " ".repeat(line.length - j);
              j = line.length;
              inMultiLineQuote = quote;
              continue;
            } else {
              result += " ".repeat(endIdx + quoteLen - j);
              j = endIdx + quoteLen;
              continue;
            }
          }

          // Single quote string (e.g. '...' or "...")
          let k = j + prefixLen + quoteLen;
          let maskedStr = " ".repeat(prefixLen + quoteLen);

          if (isFString) {
            let braceDepth = 0;
            while (k < line.length) {
              if (line[k] === "\\") {
                maskedStr += "  ";
                k += 2;
                continue;
              }
              if (line[k] === "{" && line[k + 1] === "{") {
                maskedStr += "  ";
                k += 2;
                continue;
              }
              if (line[k] === "}" && line[k + 1] === "}") {
                maskedStr += "  ";
                k += 2;
                continue;
              }
              if (line[k] === "{") {
                braceDepth++;
                maskedStr += " ";
                k++;
                continue;
              }
              if (line[k] === "}") {
                if (braceDepth > 0) braceDepth--;
                maskedStr += " ";
                k++;
                continue;
              }
              if (line[k] === quote && braceDepth === 0) {
                maskedStr += " ";
                k++;
                break;
              }
              if (braceDepth > 0) {
                maskedStr += line[k];
              } else {
                maskedStr += " ";
              }
              k++;
            }
          } else {
            while (k < line.length && line[k] !== quote) {
              if (line[k] === "\\") {
                maskedStr += "  ";
                k += 2;
              } else {
                maskedStr += " ";
                k++;
              }
            }
            if (k < line.length && line[k] === quote) {
              maskedStr += " ";
              k++;
            }
          }

          result += maskedStr;
          j = k;
          continue;
        }
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
      const key = `${line}:${ruleId}:${message}`;
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

    // Symbol tracking for undefined variables and unused variables
    const definedSymbols = new Set<string>(PYTHON_BUILTINS);
    const definedSymbolsWithLine = new Map<string, number>();
    const usedSymbols = new Set<string>();
    let hasWildcardImport = false;
    let loopDepth = 0;
    const loopDepths: number[] = [];
    let functionDepth = 0;
    const functionDepths: number[] = [];

    // First pass: collect defined symbols (imports, functions, classes, assignments, parameters)
    for (let idx = 0; idx < maskedLines.length; idx++) {
      const lineNum = idx + 1;
      const masked = maskedLines[idx];
      const trimmed = masked.trim();
      if (!trimmed) continue;

      // Import statements: import x, y as z
      const importMatch = /^\s*import\s+([a-zA-Z0-9_,\s]+)/.exec(trimmed);
      if (importMatch) {
        importMatch[1].split(",").forEach((part) => {
          const asMatch = /\b(?:as\s+)?([a-zA-Z_]\w*)$/.exec(part.trim());
          if (asMatch) {
            definedSymbols.add(asMatch[1]);
            definedSymbolsWithLine.set(asMatch[1], lineNum);
          }
        });
      }

      // From import: from mod import a, b as c, *
      const fromImportMatch = /^\s*from\s+[\w.]+\s+import\s+([a-zA-Z0-9_*,\s]+)/.exec(trimmed);
      if (fromImportMatch) {
        if (fromImportMatch[1].includes("*")) {
          hasWildcardImport = true;
        } else {
          fromImportMatch[1].split(",").forEach((part) => {
            const asMatch = /\b(?:as\s+)?([a-zA-Z_]\w*)$/.exec(part.trim());
            if (asMatch) {
              definedSymbols.add(asMatch[1]);
              definedSymbolsWithLine.set(asMatch[1], lineNum);
            }
          });
        }
      }

      // Function definition: def foo(a, b=1, *args, **kwargs):
      const defMatch = /^\s*def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/.exec(trimmed);
      if (defMatch) {
        definedSymbols.add(defMatch[1]);
        const params = defMatch[2].split(",");
        const paramNamesSeen = new Set<string>();
        params.forEach((param) => {
          const p = param.trim().replace(/^[*]+/, "").split("=")[0].split(":")[0].trim();
          if (p && /^[a-zA-Z_]\w*$/.test(p)) {
            if (paramNamesSeen.has(p)) {
              addFinding(
                lineNum,
                "high",
                "python-duplicate-argument",
                `SyntaxError: duplicate argument '${p}' in function definition.`,
                `Rename or remove the duplicate parameter '${p}'.`
              );
            }
            paramNamesSeen.add(p);
            definedSymbols.add(p);
            definedSymbolsWithLine.set(p, lineNum);
          }
        });
      }

      // Class definition: class Foo:
      const classMatch = /^\s*class\s+([a-zA-Z_]\w*)/.exec(trimmed);
      if (classMatch) {
        definedSymbols.add(classMatch[1]);
      }

      // Assignment: x = ..., x, y = ..., for x in ...
      const assignMatch = /^\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*(?::\s*[^=]+)?\s*=(?!=)/.exec(trimmed);
      if (assignMatch && !/^(?:if|elif|while|assert)\b/.test(trimmed)) {
        assignMatch[1].split(",").forEach((v) => {
          const name = v.trim();
          if (name && !PYTHON_KEYWORDS.has(name)) {
            definedSymbols.add(name);
            definedSymbolsWithLine.set(name, lineNum);
          }
        });
      }

      // For loop target (statement or comprehension): for item in ...:
      const forMatches = masked.matchAll(/\bfor\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\b/g);
      for (const forMatch of forMatches) {
        forMatch[1].split(",").forEach((v) => {
          const name = v.trim();
          if (name && !PYTHON_KEYWORDS.has(name)) {
            definedSymbols.add(name);
            definedSymbolsWithLine.set(name, lineNum);
          }
        });
      }

      // With statement: with ... as f:
      const withMatch = /\bas\s+([a-zA-Z_]\w*)\s*:?$/.exec(trimmed);
      if (withMatch) {
        definedSymbols.add(withMatch[1]);
        definedSymbolsWithLine.set(withMatch[1], lineNum);
      }

      // Except statement: except Exc as e:
      const exceptMatch = /^\s*except\b.*?\bas\s+([a-zA-Z_]\w*)\s*:/.exec(trimmed);
      if (exceptMatch) {
        definedSymbols.add(exceptMatch[1]);
        definedSymbolsWithLine.set(exceptMatch[1], lineNum);
      }
    }

    // Line-by-line checks
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

      // Track loop depth by indentation
      while (loopDepths.length > 0 && currentIndent <= loopDepths[loopDepths.length - 1]) {
        loopDepths.pop();
      }
      if (/^\s*(?:for|while)\b/.test(trimmed)) {
        loopDepths.push(currentIndent);
      }
      loopDepth = loopDepths.length;

      // Track function depth by indentation
      while (functionDepths.length > 0 && currentIndent <= functionDepths[functionDepths.length - 1]) {
        functionDepths.pop();
      }
      if (/^\s*def\b/.test(trimmed)) {
        functionDepths.push(currentIndent);
      }
      functionDepth = functionDepths.length;

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

      // Python 2 print statement without parentheses (e.g. print "hello")
      if (/^\s*print\s+(?![(])\S+/.test(trimmed)) {
        addFinding(
          lineNum,
          "high",
          "python-print-syntax",
          "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...) ?",
          "Wrap print arguments in parentheses: print(...)."
        );
      }

      // Assignment in conditional statement: if x = 5:
      if (/^\s*(?:if|elif|while)\s+[a-zA-Z_]\w*\s*=(?!=)/.test(trimmed)) {
        addFinding(
          lineNum,
          "high",
          "python-assignment-in-condition",
          "SyntaxError: invalid syntax. Assignment '=' in condition; did you mean '=='?",
          "Use '==' for comparison instead of '='."
        );
      }

      // Return outside function
      if (/^\s*return\b/.test(trimmed) && functionDepth === 0) {
        addFinding(
          lineNum,
          "high",
          "python-return-outside-function",
          "SyntaxError: 'return' outside function.",
          "Move 'return' inside a function definition, or remove it."
        );
      }

      // Break / Continue outside loop
      if (/^\s*(?:break|continue)\b/.test(trimmed) && loopDepth === 0) {
        const keyword = trimmed.startsWith("break") ? "break" : "continue";
        addFinding(
          lineNum,
          "high",
          "python-break-outside-loop",
          `SyntaxError: '${keyword}' outside loop.`,
          `'${keyword}' can only be used inside a 'for' or 'while' loop.`
        );
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

      // Comparison with literal using 'is'
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

      // Check for undefined variables in expressions (if no wildcard import)
      if (!hasWildcardImport) {
        // Strip out the assignment target if this is an assignment line
        let exprPart = masked;
        const assignSplit = masked.match(/^\s*[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\s*(?::\s*[^=]+)?\s*=(?!=)\s*(.*)$/);
        if (assignSplit) {
          exprPart = assignSplit[1];
        } else if (/^\s*def\s+[a-zA-Z_]\w*/.test(masked) || /^\s*class\s+[a-zA-Z_]\w*/.test(masked) || /^\s*(?:import|from)\b/.test(masked)) {
          exprPart = "";
        }

        // Find identifier tokens in the expression
        const tokenRegex = /\b[a-zA-Z_]\w*\b/g;
        let tokenMatch: RegExpExecArray | null;
        while ((tokenMatch = tokenRegex.exec(exprPart)) !== null) {
          const ident = tokenMatch[0];
          // Check preceding character: if it's a dot, it's an attribute access (e.g. obj.attr), ignore attr
          const beforeStr = exprPart.slice(0, tokenMatch.index).trimEnd();
          if (beforeStr.endsWith(".")) {
            continue;
          }

          // Check if followed by '=' (keyword argument in call, e.g. func(arg=val)), skip undef check
          const afterStr = exprPart.slice(tokenMatch.index + ident.length).trimStart();
          if (afterStr.startsWith("=") && !afterStr.startsWith("==")) {
            continue;
          }

          if (!PYTHON_KEYWORDS.has(ident)) {
            usedSymbols.add(ident);
            if (!definedSymbols.has(ident)) {
              addFinding(
                lineNum,
                "high",
                "python-no-undef",
                `NameError: name '${ident}' is not defined.`,
                `Define or import '${ident}' before using it.`
              );
            }
          }
        }
      }
    }

    // Check for unused variables (defined variables not in builtins that were never referenced)
    for (const [symbol, line] of definedSymbolsWithLine.entries()) {
      if (
        !usedSymbols.has(symbol) &&
        !PYTHON_BUILTINS.has(symbol) &&
        !PYTHON_KEYWORDS.has(symbol) &&
        !symbol.startsWith("_")
      ) {
        addFinding(
          line,
          "medium",
          "python-unused-variable",
          `'${symbol}' is defined but never used.`,
          `Remove '${symbol}' or prefix with '_' if intentional.`
        );
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
