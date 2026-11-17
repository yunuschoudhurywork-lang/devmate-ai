import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding, Severity } from "../types/analysis";

interface BracketToken {
  char: string;
  line: number;
}

const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
  "class", "const", "continue", "default", "do", "double", "else", "enum",
  "extends", "final", "finally", "float", "for", "goto", "if", "implements",
  "import", "instanceof", "int", "interface", "long", "native", "new",
  "package", "private", "protected", "public", "return", "short", "static",
  "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
  "transient", "try", "void", "volatile", "while", "record", "sealed",
  "non-sealed", "permits", "var", "yield", "true", "false", "null"
]);

const JAVA_BUILTINS = new Set([
  "System", "Math", "String", "Integer", "Long", "Double", "Float", "Boolean",
  "Character", "Byte", "Short", "Object", "Class", "Thread", "Runnable",
  "Exception", "RuntimeException", "Throwable", "Error", "Override", "Deprecated",
  "SuppressWarnings", "List", "ArrayList", "LinkedList", "Map", "HashMap",
  "TreeMap", "Set", "HashSet", "TreeSet", "Arrays", "Collections", "Objects",
  "Scanner", "File", "Path", "Paths", "Files", "InputStream", "OutputStream",
  "Reader", "Writer", "BufferedReader", "BufferedWriter", "FileReader", "FileWriter",
  "PrintStream", "StringBuilder", "StringBuffer", "Optional", "Stream", "Collectors",
  "Comparator", "Date", "Calendar", "UUID", "Pattern", "Matcher", "TimeUnit",
  "out", "in", "err", "args", "length", "clone", "equals", "hashCode", "toString",
  "main", "get", "set", "size", "add", "remove", "clear", "contains", "isEmpty",
  "IllegalArgumentException", "IllegalStateException", "NullPointerException",
  "IndexOutOfBoundsException", "ArrayIndexOutOfBoundsException", "UnsupportedOperationException",
  "IOException", "FileNotFoundException", "NoSuchElementException", "NumberFormatException"
]);

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

      if (line.slice(j, j + 2) === "//") {
        result += " ".repeat(line.length - j);
        j = line.length;
        break;
      }

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

    let hasClassDefinition = false;
    let hasAnyCode = false;

    // Track symbols
    const definedSymbols = new Set<string>(JAVA_BUILTINS);
    const definedSymbolsWithLine = new Map<string, number>();
    const usedSymbols = new Set<string>();
    let hasWildcardImport = false;

    let loopDepth = 0;
    let inMethod = false;
    let currentMethodReturnType = "";
    let currentMethodHasReturn = false;
    let currentMethodStartLine = 1;

    // First pass: detect class definition, imports, method names, field declarations, and variable declarations
    for (let idx = 0; idx < maskedLines.length; idx++) {
      const lineNum = idx + 1;
      const masked = maskedLines[idx];
      const trimmed = masked.trim();

      if (/\b(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/.test(masked)) {
        hasClassDefinition = true;
        const classNameMatch = /\b(?:class|interface|enum|record)\s+([A-Za-z_]\w*)/.exec(masked);
        if (classNameMatch) {
          definedSymbols.add(classNameMatch[1]);
        }
      }
      if (trimmed.length > 0) {
        hasAnyCode = true;
      }

      // Package / Import statements: import java.util.List; import java.util.*;
      const importMatch = /^\s*import\s+(?:static\s+)?([a-zA-Z0-9_.*]+)\s*;/.exec(trimmed);
      if (importMatch) {
        const parts = importMatch[1].split(".");
        const lastPart = parts[parts.length - 1];
        if (lastPart === "*") {
          hasWildcardImport = true;
        } else if (lastPart) {
          definedSymbols.add(lastPart);
        }
      }

      // Method declaration: public static void main(String[] args) {
      const methodMatch = /(?:public|protected|private|static|\s)+([a-zA-Z_]\w*(?:<[^>]+>)?(?:\[\])?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{/.exec(masked);
      if (methodMatch) {
        definedSymbols.add(methodMatch[2]);
        // Extract parameters
        const params = methodMatch[3].split(",");
        params.forEach((param) => {
          const pMatch = /\b([a-zA-Z_]\w*)\s*$/.exec(param.trim());
          if (pMatch && !JAVA_KEYWORDS.has(pMatch[1])) {
            definedSymbols.add(pMatch[1]);
            definedSymbolsWithLine.set(pMatch[1], lineNum);
          }
        });
      }

      // Variable declarations: Type name = value; or Type name;
      const varDeclMatch = /^\s*(?:(?:public|protected|private|static|final|transient|volatile)\s+)*([A-Z]\w*(?:<[^>]+>)?(?:\[\])?|int|long|double|float|boolean|char|byte|short|var)\s+([a-zA-Z_]\w*)\s*(?:=|;|,)/.exec(trimmed);
      if (varDeclMatch && !JAVA_KEYWORDS.has(varDeclMatch[2])) {
        definedSymbols.add(varDeclMatch[2]);
        definedSymbolsWithLine.set(varDeclMatch[2], lineNum);
      }

      // For loop declaration: for (int i = 0; ...) or for (String s : list)
      const forDeclMatch = /\bfor\s*\(\s*(?:final\s+)?(?:[A-Z]\w*(?:<[^>]+>)?(?:\[\])?|int|long|double|float|boolean|char|byte|short|var)\s+([a-zA-Z_]\w*)\s*[:=]/.exec(masked);
      if (forDeclMatch && !JAVA_KEYWORDS.has(forDeclMatch[1])) {
        definedSymbols.add(forDeclMatch[1]);
        definedSymbolsWithLine.set(forDeclMatch[1], lineNum);
      }

      // Catch parameter: catch (Exception e)
      const catchMatch = /\bcatch\s*\(\s*[\w.]+\s+([a-zA-Z_]\w*)\s*\)/.exec(masked);
      if (catchMatch && !JAVA_KEYWORDS.has(catchMatch[1])) {
        definedSymbols.add(catchMatch[1]);
        definedSymbolsWithLine.set(catchMatch[1], lineNum);
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

      // Track loops
      if (/\b(?:for|while|do)\s*\(/.test(masked)) {
        loopDepth++;
      }

      // Method tracking
      const methodStart = /(?:public|protected|private|static|\s)+([a-zA-Z_]\w*(?:<[^>]+>)?(?:\[\])?)\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/.exec(masked);
      if (methodStart) {
        inMethod = true;
        currentMethodReturnType = methodStart[1].trim();
        currentMethodHasReturn = false;
        currentMethodStartLine = lineNum;
      }

      if (/\breturn\b/.test(trimmed)) {
        currentMethodHasReturn = true;
      }

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
          } else if (char === "}" && inMethod && bracketStack.filter((b) => b.char === "{").length <= 1) {
            // End of method
            if (currentMethodReturnType && currentMethodReturnType !== "void" && !currentMethodHasReturn) {
              addFinding(
                currentMethodStartLine,
                "high",
                "java-missing-return",
                `Missing return statement in method returning '${currentMethodReturnType}'.`,
                `Add a 'return' statement returning a value of type '${currentMethodReturnType}'.`
              );
            }
            inMethod = false;
          }
        }
      }

      // Break / Continue outside loop or switch
      if (/^\s*(?:break|continue)\s*;/.test(trimmed) && loopDepth === 0 && !/\bcase\b|\bdefault\b/.test(masked)) {
        const keyword = trimmed.startsWith("break") ? "break" : "continue";
        addFinding(
          lineNum,
          "high",
          "java-break-outside-loop",
          `'${keyword}' statement outside of loop or switch.`,
          `'${keyword}' can only be used inside a loop or switch statement.`
        );
      }

      // Assignment in if statement: if (x = 5)
      if (/\bif\s*\(\s*[a-zA-Z_]\w*\s*=(?!=)/.test(masked)) {
        addFinding(
          lineNum,
          "high",
          "java-assignment-in-condition",
          "Assignment '=' used inside conditional expression. Did you mean '=='?",
          "Use '==' for comparison instead of '='."
        );
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

      // Check for undefined variables in expressions (if not in wildcard import)
      if (!hasWildcardImport && !/^\s*(?:import|package)\b/.test(trimmed)) {
        // Skip method signature lines, class declarations, and annotations
        const isMethodSignature = /(?:public|protected|private|static|\s)+[a-zA-Z_]\w*(?:<[^>]+>)?(?:\[\])?\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/.test(masked);
        const isClassDecl = /\b(?:class|interface|enum|record)\s+[a-zA-Z_]\w*/.test(masked);
        const isAnnotation = trimmed.startsWith("@");

        if (!isMethodSignature && !isClassDecl && !isAnnotation) {
          // Strip out the variable declaration target if this line is an assignment
          let expr = masked;
          const declMatch = /^\s*(?:(?:public|protected|private|static|final|transient|volatile)\s+)*([A-Z]\w*(?:<[^>]+>)?(?:\[\])?|int|long|double|float|boolean|char|byte|short|var)\s+([a-zA-Z_]\w*)\s*=\s*(.*)$/.exec(trimmed);
          if (declMatch) {
            expr = declMatch[3];
          }

          const tokenRegex = /\b[a-zA-Z_]\w*\b/g;
          let tokenMatch: RegExpExecArray | null;
          while ((tokenMatch = tokenRegex.exec(expr)) !== null) {
            const ident = tokenMatch[0];
            // Ignore member accesses like obj.member
            const beforeStr = expr.slice(0, tokenMatch.index).trimEnd();
            if (beforeStr.endsWith(".")) {
              continue;
            }

            if (!JAVA_KEYWORDS.has(ident)) {
              usedSymbols.add(ident);
              if (!definedSymbols.has(ident)) {
                addFinding(
                  lineNum,
                  "high",
                  "java-no-undef",
                  `Cannot find symbol: variable '${ident}'.`,
                  `Declare or import '${ident}' before referencing it.`
                );
              }
            }
          }
        }
      }
    }

    // Check for unused variables in Java
    for (const [symbol, line] of definedSymbolsWithLine.entries()) {
      if (
        !usedSymbols.has(symbol) &&
        !JAVA_BUILTINS.has(symbol) &&
        !JAVA_KEYWORDS.has(symbol) &&
        symbol !== "args"
      ) {
        addFinding(
          line,
          "medium",
          "java-unused-variable",
          `Variable '${symbol}' is defined but never used.`,
          `Remove '${symbol}' or use it in the method.`
        );
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
