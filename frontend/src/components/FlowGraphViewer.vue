<script setup lang="ts">
import { computed, ref } from "vue";
import { generateFlowGraph, type FlowNode } from "@/utils/flowGraphGenerator";
import type { AnalysisLanguage, Finding } from "@/types/analysis";

const props = defineProps<{
  code: string;
  language: AnalysisLanguage;
  findings?: Finding[];
}>();

const emit = defineEmits<{
  "select-line": [line: number];
}>();

const zoomLevel = ref(1);
const showOnlyVulnerable = ref(false);
const selectedNodeId = ref<string | null>(null);

const graph = computed(() => {
  return generateFlowGraph(props.code, props.language, props.findings ?? []);
});

const displayedNodes = computed(() => {
  if (!showOnlyVulnerable.value) {
    return graph.value.nodes;
  }
  return graph.value.nodes.filter(
    (n) => n.isVulnerable || n.type === "entry" || n.type === "exit"
  );
});

const displayedEdges = computed(() => {
  const visibleIds = new Set(displayedNodes.value.map((n) => n.id));
  return graph.value.edges.filter(
    (e) => visibleIds.has(e.from) && visibleIds.has(e.to)
  );
});

const nodeMap = computed(() => {
  const map = new Map<string, FlowNode>();
  graph.value.nodes.forEach((n) => map.set(n.id, n));
  return map;
});

const selectedNode = computed(() => {
  if (!selectedNodeId.value) {
    return graph.value.nodes.find((n) => n.isVulnerable) ?? graph.value.nodes[0] ?? null;
  }
  return nodeMap.value.get(selectedNodeId.value) ?? null;
});

function handleNodeClick(node: FlowNode): void {
  selectedNodeId.value = node.id;
  emit("select-line", node.line);
}

function zoomIn(): void {
  zoomLevel.value = Math.min(1.5, Number((zoomLevel.value + 0.15).toFixed(2)));
}

function zoomOut(): void {
  zoomLevel.value = Math.max(0.6, Number((zoomLevel.value - 0.15).toFixed(2)));
}

function resetZoom(): void {
  zoomLevel.value = 1;
}

function getNodeIcon(type: FlowNode["type"]): string {
  switch (type) {
    case "entry":
      return "🚀";
    case "function":
      return "⚡";
    case "condition":
      return "🔀";
    case "loop":
      return "🔁";
    case "error_handler":
      return "🛡️";
    case "vulnerability":
      return "⚠️";
    case "exit":
      return "🏁";
    default:
      return "◆";
  }
}

function getEdgePath(edge: { from: string; to: string }): string {
  const from = nodeMap.value.get(edge.from);
  const to = nodeMap.value.get(edge.to);
  if (!from || !to) return "";

  const startX = from.x + from.width / 2;
  const startY = from.y + from.height;
  const endX = to.x + to.width / 2;
  const endY = to.y;

  const deltaY = endY - startY;
  const controlY1 = startY + deltaY * 0.45;
  const controlY2 = startY + deltaY * 0.55;

  return `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;
}
</script>

<template>
  <div class="flow-graph-container">
    <!-- Graph Header Controls & Metrics -->
    <header class="flow-header">
      <div class="metrics-pills">
        <div class="flow-pill" title="Total Control Flow Nodes in Code">
          <span class="pill-dot blue"></span>
          <span><strong>{{ graph.summary.totalNodes }}</strong> Nodes</span>
        </div>

        <div
          v-if="graph.summary.vulnerableNodes > 0"
          class="flow-pill danger"
          title="Nodes containing detected security/quality issues"
        >
          <span class="pill-dot red pulse"></span>
          <span><strong>{{ graph.summary.vulnerableNodes }}</strong> Hotspots</span>
        </div>

        <div v-else class="flow-pill clean">
          <span class="pill-dot green"></span>
          <span><strong>All Safe</strong></span>
        </div>
      </div>

      <div class="flow-controls">
        <button
          type="button"
          class="btn-filter"
          :class="{ active: showOnlyVulnerable }"
          @click="showOnlyVulnerable = !showOnlyVulnerable"
          title="Toggle vulnerability-only paths"
        >
          <span>{{ showOnlyVulnerable ? "🔴 Showing Vulnerabilities" : "👁️ Show All Logic" }}</span>
        </button>

        <div class="zoom-group">
          <button type="button" class="btn-tool" @click="zoomOut" title="Zoom Out">−</button>
          <button type="button" class="btn-tool zoom-label" @click="resetZoom" title="Reset Zoom">
            {{ Math.round(zoomLevel * 100) }}%
          </button>
          <button type="button" class="btn-tool" @click="zoomIn" title="Zoom In">+</button>
        </div>
      </div>
    </header>

    <!-- Visual Canvas Area -->
    <div class="flow-stage">
      <div
        class="zoom-wrapper"
        :style="{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center'
        }"
      >
        <svg
          class="flow-svg"
          :width="graph.width"
          :height="graph.height"
          :viewBox="`0 0 ${graph.width} ${graph.height}`"
        >
          <defs>
            <!-- Normal Arrowhead -->
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#67e8f9" />
            </marker>

            <!-- Vulnerable Arrowhead -->
            <marker
              id="arrow-vuln"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
            </marker>
          </defs>

          <!-- Render Connectors / Edges -->
          <g class="edges-layer">
            <path
              v-for="edge in displayedEdges"
              :key="edge.id"
              :d="getEdgePath(edge)"
              class="flow-edge"
              :class="{ 'vuln-edge': edge.isVulnerablePath }"
              :marker-end="edge.isVulnerablePath ? 'url(#arrow-vuln)' : 'url(#arrow-normal)'"
            />
          </g>

          <!-- Render Interactive Nodes -->
          <g class="nodes-layer">
            <g
              v-for="node in displayedNodes"
              :key="node.id"
              class="node-group"
              :class="{
                'is-vulnerable': node.isVulnerable,
                'is-selected': selectedNode?.id === node.id,
                'is-critical': node.highestSeverity === 'critical' || node.highestSeverity === 'high'
              }"
              :transform="`translate(${node.x}, ${node.y})`"
              @click="handleNodeClick(node)"
            >
              <!-- Outer Glow / Background Box -->
              <rect
                class="node-box"
                :width="node.width"
                :height="node.height"
                rx="10"
              />

              <!-- Pulsing indicator border for critical issues -->
              <rect
                v-if="node.isVulnerable"
                class="node-pulse-border"
                :width="node.width"
                :height="node.height"
                rx="10"
              />

              <!-- Node Header: Icon, Label, and Line pill -->
              <text x="14" y="28" class="node-icon">{{ getNodeIcon(node.type) }}</text>
              <text x="40" y="27" class="node-title">{{ node.label }}</text>

              <!-- Line Number Tag -->
              <g :transform="`translate(${node.width - 58}, 12)`">
                <rect class="line-pill-bg" width="46" height="20" rx="4" />
                <text x="23" y="14" class="line-pill-text">L{{ node.line }}</text>
              </g>

              <!-- Node Body Detail -->
              <text x="14" y="52" class="node-detail">{{ node.detail }}</text>

              <!-- Bottom Status Badge -->
              <g :transform="`translate(14, 62)`">
                <rect
                  class="status-pill-bg"
                  :class="node.isVulnerable ? 'danger' : 'safe'"
                  width="110"
                  height="16"
                  rx="3"
                />
                <text
                  x="55"
                  y="12"
                  class="status-pill-text"
                  :class="node.isVulnerable ? 'danger' : 'safe'"
                >
                  {{ node.isVulnerable ? `⚠️ ${node.findings.length} issue(s)` : "✓ Logic Safe" }}
                </text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>

    <!-- Node Inspector Card (Bottom / Drawer) -->
    <div v-if="selectedNode" class="node-inspector">
      <div class="inspector-header">
        <div class="inspector-title">
          <span class="inspector-icon">{{ getNodeIcon(selectedNode.type) }}</span>
          <strong>{{ selectedNode.label }}</strong>
          <span class="inspector-line">Line {{ selectedNode.line }}</span>
        </div>

        <button
          type="button"
          class="btn-jump-editor"
          @click="emit('select-line', selectedNode.line)"
        >
          <span>⚡ Jump to Code</span>
        </button>
      </div>

      <div class="inspector-body">
        <p class="code-preview"><code>{{ selectedNode.detail }}</code></p>

        <!-- Findings List on this node -->
        <div v-if="selectedNode.findings.length > 0" class="inspector-findings">
          <div
            v-for="finding in selectedNode.findings"
            :key="finding.ruleId"
            class="inspector-finding-card"
            :class="finding.severity"
          >
            <div class="f-header">
              <span class="f-badge" :class="finding.severity">{{ finding.severity.toUpperCase() }}</span>
              <span class="f-rule">{{ finding.ruleId }}</span>
            </div>
            <p class="f-msg">{{ finding.message }}</p>
            <p v-if="finding.suggestion" class="f-suggest">
              <strong>💡 Suggestion:</strong> {{ finding.suggestion }}
            </p>
          </div>
        </div>

        <p v-else class="inspector-safe-note">
          ✓ No vulnerabilities or errors detected at this execution step.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-graph-container {
  display: flex;
  flex-direction: column;
  background: #090e1a;
  border: 1.5px solid rgba(103, 232, 249, 0.2);
  border-radius: 12px;
  overflow: hidden;
  height: 620px;
  position: relative;
}

/* Header */
.flow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: #0f172a;
  border-bottom: 1.5px solid rgba(103, 232, 249, 0.15);
  gap: 1rem;
  flex-wrap: wrap;
}

.metrics-pills {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.flow-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(103, 232, 249, 0.25);
  border-radius: 20px;
  font-size: 0.78rem;
  color: #94a3b8;
  font-family: var(--font-mono, monospace);
}

.flow-pill strong {
  color: #ffffff;
}

.flow-pill.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

.flow-pill.danger strong {
  color: #ef4444;
}

.flow-pill.clean {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.08);
  color: #6ee7b7;
}

.pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.pill-dot.blue { background: #67e8f9; }
.pill-dot.red { background: #ef4444; }
.pill-dot.green { background: #10b981; }

.pill-dot.pulse {
  animation: pulse-dot 1.4s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 8px #ef4444; }
  100% { transform: scale(0.9); opacity: 0.8; }
}

.flow-controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-filter {
  padding: 0.4rem 0.85rem;
  background: #090e1a;
  border: 1px solid rgba(103, 232, 249, 0.3);
  border-radius: 6px;
  color: #67e8f9;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-filter:hover {
  background: rgba(103, 232, 249, 0.15);
  border-color: #67e8f9;
}

.btn-filter.active {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

.zoom-group {
  display: inline-flex;
  border: 1px solid rgba(103, 232, 249, 0.25);
  border-radius: 6px;
  overflow: hidden;
}

.btn-tool {
  background: #090e1a;
  color: #94a3b8;
  border: none;
  padding: 0.35rem 0.65rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-tool:hover {
  background: #1e293b;
  color: #67e8f9;
}

.btn-tool.zoom-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  padding: 0.35rem 0.5rem;
}

/* Stage */
.flow-stage {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  background: radial-gradient(circle at 50% 20%, rgba(15, 23, 42, 0.8) 0%, #070b14 100%);
  user-select: none;
}

.zoom-wrapper {
  transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.flow-svg {
  display: block;
}

/* Edges */
.flow-edge {
  fill: none;
  stroke: #38bdf8;
  stroke-width: 2.2px;
  stroke-linecap: round;
  transition: all 0.2s;
}

.flow-edge.vuln-edge {
  stroke: #ef4444;
  stroke-width: 2.8px;
  stroke-dasharray: 6 3;
  animation: flow-dash 1.2s linear infinite;
}

@keyframes flow-dash {
  to {
    stroke-dashoffset: -18;
  }
}

/* Nodes */
.node-group {
  cursor: pointer;
  transition: transform 0.18s ease;
}

.node-group:hover {
  transform: translateY(-2px);
}

.node-box {
  fill: #0f172a;
  stroke: #38bdf8;
  stroke-width: 1.5px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
  transition: all 0.2s;
}

.node-group:hover .node-box {
  stroke: #67e8f9;
  stroke-width: 2px;
  filter: drop-shadow(0 0 14px rgba(103, 232, 249, 0.3));
}

.node-group.is-selected .node-box {
  stroke: #67e8f9;
  stroke-width: 2.5px;
  filter: drop-shadow(0 0 16px rgba(103, 232, 249, 0.5));
}

.node-group.is-vulnerable .node-box {
  fill: #181119;
  stroke: #ef4444;
  stroke-width: 2px;
}

.node-pulse-border {
  fill: none;
  stroke: #ef4444;
  stroke-width: 2px;
  animation: pulse-box 1.6s ease-out infinite;
}

@keyframes pulse-box {
  0% { transform: scale(1); opacity: 0.9; stroke-width: 2px; }
  100% { transform: scale(1.04); opacity: 0; stroke-width: 6px; }
}

.node-icon {
  font-size: 16px;
}

.node-title {
  fill: #ffffff;
  font-size: 13px;
  font-weight: 700;
  font-family: var(--font-heading, sans-serif);
}

.node-detail {
  fill: #94a3b8;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
}

.line-pill-bg {
  fill: #1e293b;
  stroke: rgba(103, 232, 249, 0.25);
  stroke-width: 1px;
}

.line-pill-text {
  fill: #67e8f9;
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
  font-family: var(--font-mono, monospace);
}

.status-pill-bg.safe {
  fill: rgba(16, 185, 129, 0.15);
}
.status-pill-bg.danger {
  fill: rgba(239, 68, 68, 0.2);
}

.status-pill-text {
  font-size: 9.5px;
  font-weight: 700;
  text-anchor: middle;
  font-family: var(--font-mono, monospace);
}
.status-pill-text.safe {
  fill: #34d399;
}
.status-pill-text.danger {
  fill: #f87171;
}

/* Inspector Bottom Panel */
.node-inspector {
  background: #0a1120;
  border-top: 1.5px solid rgba(103, 232, 249, 0.2);
  padding: 0.85rem 1.25rem;
  max-height: 180px;
  overflow-y: auto;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.45rem;
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #ffffff;
  font-size: 0.92rem;
}

.inspector-line {
  background: #1e293b;
  color: #67e8f9;
  border: 1px solid rgba(103, 232, 249, 0.3);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-family: var(--font-mono, monospace);
}

.btn-jump-editor {
  background: #0f172a;
  color: #67e8f9;
  border: 1.5px solid #67e8f9;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-jump-editor:hover {
  background: rgba(103, 232, 249, 0.15);
  box-shadow: 0 0 10px rgba(103, 232, 249, 0.4);
}

.code-preview code {
  color: #cbd5e1;
  background: #060911;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.82rem;
  font-family: var(--font-mono, monospace);
}

.inspector-findings {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.inspector-finding-card {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  border-left: 3px solid #ef4444;
}

.inspector-finding-card.critical,
.inspector-finding-card.high {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.inspector-finding-card.medium {
  border-left-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.f-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.f-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  text-transform: uppercase;
}

.f-badge.critical,
.f-badge.high {
  background: #ef4444;
  color: #fff;
}

.f-badge.medium {
  background: #f59e0b;
  color: #000;
}

.f-rule {
  font-family: var(--font-mono, monospace);
  color: #94a3b8;
  font-size: 0.72rem;
}

.f-msg {
  color: #f8fafc;
  font-size: 0.82rem;
  margin-bottom: 0.2rem;
}

.f-suggest {
  color: #67e8f9;
  font-size: 0.78rem;
}

.inspector-safe-note {
  color: #34d399;
  font-size: 0.82rem;
  margin-top: 0.4rem;
}

/* Light Theme Overrides */
:global(body.light-theme) .flow-graph-container {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
}

:global(body.light-theme) .flow-header {
  background: #f4f0ea;
  border-bottom: 2px solid #000000;
}

:global(body.light-theme) .flow-stage {
  background: #faf8f5;
}

:global(body.light-theme) .node-box {
  fill: #ffffff;
  stroke: #000000;
  stroke-width: 2px;
}

:global(body.light-theme) .node-title {
  fill: #000000;
}

:global(body.light-theme) .node-inspector {
  background: #f8f6f0;
  border-top: 2px solid #000000;
}

:global(body.light-theme) .btn-jump-editor {
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
}
</style>
