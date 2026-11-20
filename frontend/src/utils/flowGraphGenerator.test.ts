import { describe, it, expect } from "vitest";
import { generateFlowGraph } from "./flowGraphGenerator";
import type { Finding } from "@/types/analysis";

describe("flowGraphGenerator", () => {
  it("generates entry, exit and control flow nodes for JavaScript/TypeScript code", () => {
    const code = `
function calculateTax(income) {
  if (income > 50000) {
    return income * 0.3;
  }
  return income * 0.15;
}
    `.trim();

    const graph = generateFlowGraph(code, "javascript");

    expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
    expect(graph.nodes[0].type).toBe("entry");
    expect(graph.nodes[graph.nodes.length - 1].type).toBe("exit");
    expect(graph.edges.length).toBe(graph.nodes.length - 1);
  });

  it("identifies Python functions, conditions, and loops", () => {
    const code = `
def process_data(items):
    for item in items:
        if item.is_valid():
            save(item)
    return True
    `.trim();

    const graph = generateFlowGraph(code, "python");
    const types = graph.nodes.map((n) => n.type);

    expect(types).toContain("entry");
    expect(types).toContain("function");
    expect(types).toContain("loop");
    expect(types).toContain("condition");
    expect(types).toContain("exit");
  });

  it("attaches findings to corresponding nodes and flags vulnerability paths", () => {
    const code = `
function queryUser(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}
    `.trim();

    const findings: Finding[] = [
      {
        line: 2,
        type: "security",
        severity: "critical",
        ruleId: "security/no-sql-injection",
        message: "SQL injection vulnerability: unsanitized user input in raw query string",
        suggestion: "Use parameterized queries"
      }
    ];

    const graph = generateFlowGraph(code, "javascript", findings);

    const vulnerableNode = graph.nodes.find((n) => n.isVulnerable);
    expect(vulnerableNode).toBeDefined();
    expect(vulnerableNode?.highestSeverity).toBe("critical");
    expect(vulnerableNode?.findings.length).toBe(1);
    expect(vulnerableNode?.findings[0].ruleId).toBe("security/no-sql-injection");

    expect(graph.summary.vulnerableNodes).toBe(1);
    expect(graph.summary.criticalCount).toBe(1);

    const vulnerableEdge = graph.edges.find((e) => e.isVulnerablePath);
    expect(vulnerableEdge).toBeDefined();
  });
});
