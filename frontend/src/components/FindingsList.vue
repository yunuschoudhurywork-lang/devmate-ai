<script setup lang="ts">
import { computed, reactive } from "vue";
import { ApiError, explainFinding } from "@/services/api";
import type { AnalysisLanguage, Finding, FindingExplanation, FindingType } from "@/types/analysis";

const props = defineProps<{
  findings: Finding[];
  analyzed: boolean;
  language?: AnalysisLanguage;
  filename?: string;
  sourceContext?: string;
  reportId?: string;
}>();

const emit = defineEmits<{
  selectLine: [line: number];
}>();

const groups: Array<{ type: FindingType; title: string }> = [
  { type: "error", title: "🐞 Errors" },
  { type: "security", title: "🛡 Security" },
  { type: "performance", title: "⚡ Performance" }
];

const grouped = computed(() =>
  groups
    .map((group) => ({
      ...group,
      items: props.findings.filter((finding) => finding.type === group.type)
    }))
    .filter((group) => group.items.length > 0)
);

const pending = reactive(new Set<string>());
const explanations = reactive<Record<string, FindingExplanation | undefined>>({});
const explanationErrors = reactive<Record<string, string | undefined>>({});

const keyFor = (finding: Finding) => `${finding.ruleId}-${finding.line}-${finding.type}`;

function getHumanKind(finding: Finding): string {
  if (finding.ruleId.includes("syntax") || finding.ruleId.includes("colon") || finding.ruleId.includes("semicolon") || finding.ruleId.includes("bracket")) {
    return "Syntax Error";
  }
  if (finding.ruleId.includes("undef")) return "Undefined Variable";
  if (finding.ruleId.includes("unused")) return "Unused Variable";
  if (finding.ruleId.includes("security") || finding.ruleId.includes("sql") || finding.ruleId.includes("exec") || finding.ruleId.includes("secret")) {
    return "Security Risk";
  }
  if (finding.ruleId.includes("performance") || finding.ruleId.includes("loop") || finding.ruleId.includes("search")) {
    return "Performance Bottleneck";
  }
  return finding.type === "error" ? "Code Error" : finding.type === "security" ? "Security Issue" : "Performance Issue";
}

async function requestExplanation(finding: Finding): Promise<void> {
  const key = keyFor(finding);
  if (pending.has(key) || !props.language || !props.sourceContext) return;
  pending.add(key);
  explanationErrors[key] = undefined;
  try {
    explanations[key] = (
      await explainFinding({
        language: props.language,
        filename: props.filename,
        sourceContext: props.sourceContext,
        finding,
        reportId: props.reportId
      })
    ).explanation;
  } catch (error) {
    explanationErrors[key] = error instanceof ApiError ? error.message : "Unable to request an AI explanation.";
  } finally {
    pending.delete(key);
  }
}
</script>

<template>
  <section class="findings" aria-label="Analysis findings">
    <div class="findings-header">
      <h2>Diagnostics & Findings</h2>
      <span v-if="analyzed" class="count-badge">
        {{ findings.length }} {{ findings.length === 1 ? "issue" : "issues" }} detected
      </span>
    </div>

    <div v-if="!analyzed" class="empty-state">
      <div class="empty-icon">🔍</div>
      <p class="empty-title">Ready to analyze</p>
      <p class="empty">Run an analysis to see DevMate's findings, syntax checks, and AI explanations.</p>
    </div>

    <div v-else-if="findings.length === 0" class="empty-state success-state">
      <div class="empty-icon success-icon">✓</div>
      <p class="empty-title">Code looks clean!</p>
      <p class="empty success">✓ No issues detected in this source code.</p>
    </div>

    <div v-for="group in grouped" :key="group.type" class="finding-group">
      <div class="group-header">
        <h3>{{ group.title }}</h3>
        <span class="group-count">{{ group.items.length }}</span>
      </div>

      <article v-for="finding in group.items" :key="keyFor(finding)" class="finding-card">
        <header class="finding-top">
          <div class="finding-badges">
            <span :class="['badge-severity', finding.severity]">{{ finding.severity }}</span>
            <span class="badge-kind">{{ getHumanKind(finding) }}</span>
            <code class="rule-id">{{ finding.ruleId }}</code>
          </div>

          <span
            class="line-tag"
            role="button"
            tabindex="0"
            @click="emit('selectLine', finding.line)"
            @keydown.enter="emit('selectLine', finding.line)"
            title="Click to jump to line in editor"
          >
            📍 Line {{ finding.line }}
          </span>
        </header>

        <div class="finding-body">
          <h4 class="finding-message">{{ finding.message }}</h4>
          <p v-if="finding.suggestion" class="finding-suggestion">
            <span class="suggestion-icon">💡</span>
            <span>Suggestion: {{ finding.suggestion }}</span>
          </p>
        </div>

        <footer class="finding-footer">
          <button
            class="explain-button"
            :disabled="pending.has(keyFor(finding))"
            @click="requestExplanation(finding)"
          >
            <span class="sparkle-icon">✨</span>
            <span>{{ pending.has(keyFor(finding)) ? "Explaining…" : "Explain with AI" }}</span>
          </button>
        </footer>

        <p v-if="explanationErrors[keyFor(finding)]" class="explanation-error" role="alert">
          {{ explanationErrors[keyFor(finding)] }}
        </p>

        <!-- AI Explanation Card -->
        <div v-if="explanations[keyFor(finding)]" class="explanation-box">
          <header class="explanation-header">
            <span class="ai-badge">🤖 AI explanation</span>
          </header>
          <div class="explanation-content">
            <p>{{ explanations[keyFor(finding)]?.explanation }}</p>
          </div>

          <div class="fix-section">
            <strong>Potential fix:</strong>
            <p>{{ explanations[keyFor(finding)]?.suggestedFix }}</p>
          </div>

          <small v-if="explanations[keyFor(finding)]?.caveats" class="caveats-text">
            Caveats: {{ explanations[keyFor(finding)]?.caveats }}
          </small>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.findings {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.findings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  padding-bottom: 0.75rem;
}

.findings-header h2 {
  font-size: 1.05rem;
  color: #ffffff;
  margin: 0;
  font-weight: 600;
}

.count-badge {
  font-size: 0.75rem;
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c4b5fd;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-weight: 500;
}

/* Empty States */
.empty-state {
  background: rgba(16, 11, 29, 0.7);
  border: 1px dashed rgba(139, 92, 246, 0.25);
  border-radius: 12px;
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.empty-title {
  color: #ffffff;
  font-weight: 600;
  font-size: 1rem;
  margin: 0;
}

.empty {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0;
  max-width: 320px;
}

.success-state {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(6, 78, 59, 0.1);
}

.success-icon {
  color: #34d399;
  border: 2px solid #34d399;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  font-weight: bold;
}

.success {
  color: #34d399;
}

/* Groups */
.finding-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.group-header h3 {
  color: #ffffff;
  font-size: 0.95rem;
  margin: 0;
  font-weight: 600;
}

.group-count {
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  color: #cbd5e1;
}

/* Finding Card */
.finding-card {
  background: rgba(14, 10, 26, 0.85);
  border: 1px solid rgba(139, 92, 246, 0.22);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  backdrop-filter: blur(14px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
}

.finding-card:hover {
  border-color: rgba(168, 85, 247, 0.45);
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
}

.finding-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.finding-badges {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.badge-severity {
  font-size: 0.7rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.high, .critical {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.medium {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fde68a;
}

.low {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.4);
  color: #c7d2fe;
}

.badge-kind {
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  color: #cbd5e1;
}

.rule-id {
  font-size: 0.72rem;
  color: #c084fc;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.2);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.line-tag {
  background: rgba(124, 58, 237, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 6px;
  color: #c4b5fd;
  font-size: 0.75rem;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
}

.line-tag:hover {
  background: rgba(124, 58, 237, 0.3);
  border-color: #a855f7;
  color: #ffffff;
  transform: translateY(-1px);
}

.finding-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.finding-message {
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
}

.finding-suggestion {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  color: #a5b4fc;
  font-size: 0.8rem;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin: 0;
}

.suggestion-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.finding-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.explain-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.45rem 0.85rem;
  box-shadow: 0 0 12px rgba(124, 58, 237, 0.35);
  transition: all 0.2s ease;
}

.explain-button:hover:not(:disabled) {
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.6);
  transform: translateY(-1px);
}

.explain-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.sparkle-icon {
  font-size: 0.85rem;
}

.explanation-error {
  color: #fca5a5;
  font-size: 0.82rem;
  margin: 0.3rem 0 0;
}

/* AI Explanation Box */
.explanation-box {
  background: rgba(20, 14, 38, 0.9);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-left: 4px solid #a855f7;
  border-radius: 8px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.3rem;
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.15);
}

.explanation-header {
  display: flex;
  align-items: center;
}

.ai-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #e0e7ff;
}

.explanation-content p {
  color: #f1f5f9;
  font-size: 0.84rem;
  line-height: 1.5;
  margin: 0;
}

.fix-section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: rgba(10, 7, 20, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
}

.fix-section strong {
  color: #34d399;
  font-size: 0.8rem;
}

.fix-section p {
  color: #e2e8f0;
  font-size: 0.82rem;
  margin: 0;
  line-height: 1.4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.caveats-text {
  color: #94a3b8;
  font-size: 0.75rem;
  line-height: 1.4;
}
</style>
