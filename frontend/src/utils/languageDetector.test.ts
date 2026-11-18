import { describe, it, expect } from "vitest";
import { detectLanguage, detectLanguageFromContent, getExtensionForLanguage } from "./languageDetector";

describe("languageDetector", () => {
  it("detects language by file extension", () => {
    expect(detectLanguage("script.py")).toBe("python");
    expect(detectLanguage("App.java")).toBe("java");
    expect(detectLanguage("component.tsx")).toBe("typescript");
    expect(detectLanguage("service.ts")).toBe("typescript");
    expect(detectLanguage("index.js")).toBe("javascript");
    expect(detectLanguage("module.mjs")).toBe("javascript");
  });

  it("detects python from code content", () => {
    const pythonCode = `def calculate_total(items):\n    return sum(item.price for item in items)\n`;
    expect(detectLanguageFromContent(pythonCode)).toBe("python");
    expect(detectLanguage("snippet.txt", pythonCode)).toBe("python");
  });

  it("detects java from code content", () => {
    const javaCode = `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}`;
    expect(detectLanguageFromContent(javaCode)).toBe("java");
    expect(detectLanguage("snippet.txt", javaCode)).toBe("java");
  });

  it("detects typescript from code content", () => {
    const tsCode = `interface UserProfile {\n  id: string;\n  name: string;\n}`;
    expect(detectLanguageFromContent(tsCode)).toBe("typescript");
    expect(detectLanguage("snippet.txt", tsCode)).toBe("typescript");
  });

  it("defaults to javascript for standard or unknown content", () => {
    const jsCode = `function add(a, b) {\n  return a + b;\n}`;
    expect(detectLanguageFromContent(jsCode)).toBe("javascript");
    expect(detectLanguage("unknown.xyz")).toBe("javascript");
  });

  it("provides correct extensions", () => {
    expect(getExtensionForLanguage("python")).toBe("py");
    expect(getExtensionForLanguage("java")).toBe("java");
    expect(getExtensionForLanguage("typescript")).toBe("ts");
    expect(getExtensionForLanguage("javascript")).toBe("js");
  });
});
