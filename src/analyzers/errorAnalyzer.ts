import { ESLint } from "eslint";
import typescriptParser from "@typescript-eslint/parser";
import type { Analyzer } from "./analyzer";
import type { AnalysisInput, Finding, Severity } from "../types/analysis";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: ".js",
  typescript: ".ts"
};

export class ErrorAnalyzer implements Analyzer {
  private readonly eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["**/*.{js,ts}"],
        languageOptions: {
          parser: typescriptParser,
          parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
          },
          globals: {
            console: "readonly"
          }
        },
        rules: {
          "no-undef": "error",
          "no-unused-vars": "warn",
          "no-unreachable": "error",
          "no-constant-condition": "warn",
          "no-debugger": "warn",
          "no-dupe-keys": "error",
          "no-duplicate-case": "error"
        }
      }
    ]
  });

  async analyze(input: AnalysisInput): Promise<Finding[]> {
    const extension = LANGUAGE_EXTENSIONS[input.language];
    if (!extension) {
      return [];
    }

    const filename = input.filename ?? `source${extension}`;
    const diagnostics = await this.eslint.lintText(input.code, { filePath: filename });

    return diagnostics.flatMap((diagnostic) =>
      diagnostic.messages.map((message) => ({
        type: "error",
        severity: this.toSeverity(message.severity, message.ruleId),
        line: message.line ?? 1,
        message: message.message,
        ruleId: message.ruleId ?? "eslint-parsing-error",
        suggestion: message.suggestions?.[0]?.desc
      }))
    );
  }

  private toSeverity(eslintSeverity: number, ruleId: string | null): Severity {
    if (ruleId === null) {
      return "high";
    }

    return eslintSeverity === 2 ? "high" : "medium";
  }
}
