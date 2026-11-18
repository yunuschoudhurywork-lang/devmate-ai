import type { AnalysisLanguage } from "@/types/analysis";

const EXTENSION_MAP: Record<string, AnalysisLanguage> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  py: "python",
  pyw: "python",
  java: "java"
};

/**
 * Infer code language from source text using language-specific syntax patterns.
 */
export function detectLanguageFromContent(content: string): AnalysisLanguage {
  if (!content || !content.trim()) {
    return "javascript";
  }

  // 1. Python patterns
  if (
    /__name__\s*==\s*['"]__main__['"]/.test(content) ||
    /^\s*def\s+\w+\s*\(.*?\)\s*:/m.test(content) ||
    /^\s*class\s+\w+(\(.*?\))?\s*:/m.test(content) ||
    /^\s*elif\s+.*?:/m.test(content) ||
    /^\s*from\s+[\w.]+\s+import\s+/m.test(content) ||
    /^\s*import\s+(os|sys|math|re|json|typing|datetime)\b/m.test(content)
  ) {
    return "python";
  }

  // 2. Java patterns
  if (
    /public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]/m.test(content) ||
    /System\.(out|err)\.print/m.test(content) ||
    /^\s*package\s+[a-z0-9_.]+;/m.test(content) ||
    /^\s*import\s+java[x]?\./m.test(content) ||
    /public\s+(final\s+)?(class|interface|enum)\s+\w+/m.test(content)
  ) {
    return "java";
  }

  // 3. TypeScript patterns
  if (
    /^\s*(export\s+)?interface\s+\w+/m.test(content) ||
    /^\s*(export\s+)?type\s+\w+\s*=/m.test(content) ||
    /:\s*(string|number|boolean|any|void|unknown|never|Record<|Array<)\b/.test(content) ||
    /\bas\s+const\b/.test(content) ||
    /<[A-Z]\w*(\s*extends\s*[^>]+)?>\s*\(/.test(content)
  ) {
    return "typescript";
  }

  // 4. Default to JavaScript
  return "javascript";
}

/**
 * Detect language by file extension first, then fallback to content inspection.
 */
export function detectLanguage(filename: string, content?: string): AnalysisLanguage {
  const parts = filename.split(".");
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase() ?? "";
    if (ext in EXTENSION_MAP) {
      return EXTENSION_MAP[ext];
    }
  }

  if (content && content.trim()) {
    return detectLanguageFromContent(content);
  }

  return "javascript";
}

/**
 * Returns default file extension for an AnalysisLanguage
 */
export function getExtensionForLanguage(lang: AnalysisLanguage): string {
  switch (lang) {
    case "python":
      return "py";
    case "java":
      return "java";
    case "typescript":
      return "ts";
    case "javascript":
    default:
      return "js";
  }
}
