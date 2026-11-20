import type { AnalysisLanguage, Finding, Severity } from "@/types/analysis";

export type FlowNodeType =
  | "entry"
  | "function"
  | "condition"
  | "loop"
  | "error_handler"
  | "vulnerability"
  | "exit";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  detail: string;
  line: number;
  endLine?: number;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  findings: Finding[];
  highestSeverity?: Severity;
  isVulnerable: boolean;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  isVulnerablePath: boolean;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  width: number;
  height: number;
  summary: {
    totalNodes: number;
    vulnerableNodes: number;
    cleanNodes: number;
    criticalCount: number;
  };
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export function generateFlowGraph(
  code: string,
  language: AnalysisLanguage,
  findings: Finding[] = []
): FlowGraph {
  const lines = code.split("\n");
  const rawNodes: Array<Omit<FlowNode, "x" | "y" | "width" | "height">> = [];

  // 1. Root Entry Node
  rawNodes.push({
    id: "node_entry",
    type: "entry",
    label: "Program Entry",
    detail: "Ingest & initialize scope",
    line: 1,
    level: 0,
    findings: [],
    isVulnerable: false
  });

  let currentLevel = 1;

  // Track findings by line number for fast lookup
  const findingsByLine = new Map<number, Finding[]>();
  findings.forEach((finding) => {
    const list = findingsByLine.get(finding.line) ?? [];
    list.push(finding);
    findingsByLine.set(finding.line, list);
  });

  // 2. Scan code lines to extract control flow points
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    let detectedType: FlowNodeType | null = null;
    let label = "";
    let detail = trimmed.slice(0, 48);

    // Python syntax
    if (language === "python") {
      if (/^\s*(async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/.test(rawLine)) {
        const match = rawLine.match(/def\s+([a-zA-Z0-9_]+)/);
        detectedType = "function";
        label = `def ${match ? match[1] : "func"}()`;
      } else if (/^\s*if\s+(.+):/.test(rawLine)) {
        detectedType = "condition";
        label = "Condition (if)";
      } else if (/^\s*elif\s+(.+):/.test(rawLine)) {
        detectedType = "condition";
        label = "Branch (elif)";
      } else if (/^\s*else\s*:/.test(rawLine)) {
        detectedType = "condition";
        label = "Branch (else)";
      } else if (/^\s*(for|while)\s+/.test(rawLine)) {
        detectedType = "loop";
        label = trimmed.startsWith("for") ? "Loop (for)" : "Loop (while)";
      } else if (/^\s*(try|except|finally)\b/.test(rawLine)) {
        detectedType = "error_handler";
        label = trimmed.startsWith("except") ? "Catch (except)" : "Try/Except Block";
      } else if (/^\s*return\b/.test(rawLine)) {
        detectedType = "exit";
        label = "Return Statement";
      }
    } else {
      // JS, TS, Java syntax
      if (
        /^\s*(export\s+)?(async\s+)?function\s+([a-zA-Z0-9_]+)/.test(rawLine) ||
        /^\s*(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(async\s*)?\(.*?\)\s*=>/.test(rawLine) ||
        /^\s*(public|private|protected)?\s*(static\s+)?[\w<>[\]]+\s+([a-zA-Z0-9_]+)\s*\(.*?\)\s*\{?/.test(rawLine)
      ) {
        const nameMatch = rawLine.match(/(?:function|const|let|var|class|\b)\s+([a-zA-Z0-9_]+)/);
        detectedType = "function";
        label = `fn ${nameMatch ? nameMatch[1] : "method"}()`;
      } else if (/^\s*if\s*\(/.test(rawLine)) {
        detectedType = "condition";
        label = "Condition (if)";
      } else if (/^\s*else\s+if\s*\(/.test(rawLine)) {
        detectedType = "condition";
        label = "Branch (else if)";
      } else if (/^\s*else\b/.test(rawLine)) {
        detectedType = "condition";
        label = "Branch (else)";
      } else if (/^\s*(for|while)\s*\(/.test(rawLine)) {
        detectedType = "loop";
        label = trimmed.startsWith("for") ? "Loop (for)" : "Loop (while)";
      } else if (/^\s*(try|catch|finally)\b/.test(rawLine)) {
        detectedType = "error_handler";
        label = trimmed.startsWith("catch") ? "Catch Handler" : "Try/Catch Block";
      } else if (/^\s*(return|throw)\b/.test(rawLine)) {
        detectedType = "exit";
        label = trimmed.startsWith("throw") ? "Throw Error" : "Return";
      }
    }

    // Check if line has analysis findings
    const lineFindings = findingsByLine.get(lineNum) ?? [];
    if (!detectedType && lineFindings.length > 0) {
      detectedType = "vulnerability";
      const topFinding = lineFindings[0];
      label = `${topFinding.type.toUpperCase()}: ${topFinding.ruleId}`;
      detail = topFinding.message;
    }

    if (detectedType) {
      const nodeFindings = [...lineFindings];
      const highestSeverity = nodeFindings.length > 0
        ? nodeFindings.reduce<Severity>((prev, curr) => {
            return SEVERITY_ORDER[curr.severity] > SEVERITY_ORDER[prev] ? curr.severity : prev;
          }, nodeFindings[0].severity)
        : undefined;

      rawNodes.push({
        id: `node_L${lineNum}_${detectedType}`,
        type: detectedType,
        label,
        detail,
        line: lineNum,
        level: currentLevel,
        findings: nodeFindings,
        highestSeverity,
        isVulnerable: nodeFindings.length > 0
      });

      currentLevel++;
    }
  }

  // 3. Fallback: if no nodes were detected (e.g. short linear script), generate sequential blocks
  if (rawNodes.length === 1) {
    const chunkStep = Math.max(1, Math.floor(lines.length / 3));
    for (let l = 1; l <= lines.length; l += chunkStep) {
      const lineFindings = findingsByLine.get(l) ?? [];
      const highestSeverity = lineFindings.length > 0 ? lineFindings[0].severity : undefined;
      rawNodes.push({
        id: `node_L${l}_block`,
        type: lineFindings.length > 0 ? "vulnerability" : "function",
        label: lineFindings.length > 0 ? `Target (L${l})` : `Block (L${l}-${Math.min(l + chunkStep, lines.length)})`,
        detail: lines[l - 1]?.trim().slice(0, 40) || `Execution block at line ${l}`,
        line: l,
        level: currentLevel++,
        findings: lineFindings,
        highestSeverity,
        isVulnerable: lineFindings.length > 0
      });
    }
  }

  // 4. Ensure End / Exit Node
  const lastRawNode = rawNodes[rawNodes.length - 1];
  if (lastRawNode.type !== "exit") {
    rawNodes.push({
      id: "node_exit",
      type: "exit",
      label: "Program Exit",
      detail: "Clean return or termination",
      line: lines.length,
      level: currentLevel,
      findings: [],
      isVulnerable: false
    });
  }

  // 5. Connect Edges & Trace Vulnerability Paths
  const edges: FlowEdge[] = [];
  for (let i = 0; i < rawNodes.length - 1; i++) {
    const source = rawNodes[i];
    const target = rawNodes[i + 1];

    let edgeLabel: string | undefined = undefined;
    if (source.type === "condition") {
      edgeLabel = "eval";
    } else if (source.type === "loop") {
      edgeLabel = "iterate";
    } else if (source.type === "error_handler") {
      edgeLabel = "handle";
    }

    const isVulnerablePath = source.isVulnerable || target.isVulnerable;

    edges.push({
      id: `edge_${source.id}_to_${target.id}`,
      from: source.id,
      to: target.id,
      label: edgeLabel,
      isVulnerablePath
    });
  }

  // 6. Layout Coordinates (Hierarchical Top-Down with Alternating Horizontal Center)
  const NODE_WIDTH = 240;
  const NODE_HEIGHT = 86;
  const LEVEL_SPACING = 140;
  const CANVAS_WIDTH = 680;
  const CENTER_X = CANVAS_WIDTH / 2;

  const nodes: FlowNode[] = rawNodes.map((node, index) => {
    // Alternating horizontal staggering for conditions and loops
    let xOffset = 0;
    if (node.type === "condition") {
      xOffset = (index % 2 === 0 ? 1 : -1) * 35;
    } else if (node.type === "loop") {
      xOffset = (index % 2 === 0 ? -1 : 1) * 30;
    }

    const x = Math.round(CENTER_X - NODE_WIDTH / 2 + xOffset);
    const y = Math.round(node.level * LEVEL_SPACING + 40);

    return {
      ...node,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    };
  });

  const canvasHeight = Math.max(600, (rawNodes.length + 1) * LEVEL_SPACING + 60);

  const vulnerableNodes = nodes.filter((n) => n.isVulnerable).length;
  const criticalCount = nodes.filter(
    (n) => n.highestSeverity === "critical" || n.highestSeverity === "high"
  ).length;

  return {
    nodes,
    edges,
    width: CANVAS_WIDTH,
    height: canvasHeight,
    summary: {
      totalNodes: nodes.length,
      vulnerableNodes,
      cleanNodes: nodes.length - vulnerableNodes,
      criticalCount
    }
  };
}
