<script setup lang="ts">
import { computed, reactive } from "vue";
import { ApiError, explainFinding } from "@/services/api";
import type { AnalysisLanguage, Finding, FindingExplanation, FindingType } from "@/types/analysis";

const props = defineProps<{ findings: Finding[]; analyzed: boolean; language?: AnalysisLanguage; filename?: string; sourceContext?: string; reportId?: string }>();
const groups: Array<{ type: FindingType; title: string }> = [
  { type: "error", title: "🐞 Errors" },
  { type: "security", title: "🛡 Security" },
  { type: "performance", title: "⚡ Performance" }
];
const grouped = computed(() => groups.map((group) => ({ ...group, items: props.findings.filter((finding) => finding.type === group.type) })).filter((group) => group.items.length > 0));
const pending = reactive(new Set<string>());
const explanations = reactive<Record<string, FindingExplanation | undefined>>({});
const explanationErrors = reactive<Record<string, string | undefined>>({});
const keyFor = (finding: Finding) => `${finding.ruleId}-${finding.line}-${finding.type}`;

async function requestExplanation(finding: Finding): Promise<void> {
  const key = keyFor(finding);
  if (pending.has(key) || !props.language || !props.sourceContext) return;
  pending.add(key);
  explanationErrors[key] = undefined;
  try {
    explanations[key] = (await explainFinding({
      language: props.language,
      filename: props.filename,
      sourceContext: props.sourceContext,
      finding,
      reportId: props.reportId
    })).explanation;
  } catch (error) {
    explanationErrors[key] = error instanceof ApiError ? error.message : "Unable to request an AI explanation.";
  } finally {
    pending.delete(key);
  }
}
</script>

<template>
  <section class="findings" aria-label="Analysis findings">
    <p v-if="!analyzed" class="empty">Run an analysis to see DevMate's findings.</p>
    <p v-else-if="findings.length === 0" class="empty success">✓ No issues detected.</p>
    <div v-for="group in grouped" :key="group.type" class="finding-group">
      <h3>{{ group.title }}</h3>
      <article v-for="finding in group.items" :key="keyFor(finding)" class="finding">
        <div class="finding-meta"><span :class="['badge', finding.severity]">{{ finding.severity }}</span><span>Line {{ finding.line }}</span><code>{{ finding.ruleId }}</code></div>
        <p>{{ finding.message }}</p>
        <small v-if="finding.suggestion">Suggestion: {{ finding.suggestion }}</small>
        <button class="explain-button" :disabled="pending.has(keyFor(finding))" @click="requestExplanation(finding)">{{ pending.has(keyFor(finding)) ? "Explaining…" : "Explain with AI" }}</button>
        <p v-if="explanationErrors[keyFor(finding)]" class="explanation-error" role="alert">{{ explanationErrors[keyFor(finding)] }}</p>
        <div v-if="explanations[keyFor(finding)]" class="explanation"><strong>AI explanation</strong><p>{{ explanations[keyFor(finding)]?.explanation }}</p><strong>Potential fix</strong><p>{{ explanations[keyFor(finding)]?.suggestedFix }}</p><small v-if="explanations[keyFor(finding)]?.caveats">Caveats: {{ explanations[keyFor(finding)]?.caveats }}</small></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.empty { color: #94a3b8; padding: 2rem 0; text-align: center; } .success { color: #86efac; }
.finding-group { margin-bottom: 1.3rem; } h3 { color: #e2e8f0; font-size: 1rem; }
.finding { background: #172033; border: 1px solid #293750; border-radius: 8px; margin-top: .6rem; padding: .85rem; } .finding p { margin: .6rem 0; }
.finding-meta { display: flex; flex-wrap: wrap; gap: .5rem; color: #94a3b8; font-size: .8rem; } code { color: #7dd3fc; }
.badge { border-radius: 999px; font-size: .75rem; padding: .1rem .45rem; text-transform: uppercase; } .high, .critical { background: #7f1d1d; color: #fecaca; } .medium { background: #78350f; color: #fde68a; } .low { background: #1e3a5f; color: #bfdbfe; }
small { color: #cbd5e1; }
.explain-button { background: #155e75; border: 0; border-radius: 5px; color: #ecfeff; cursor: pointer; margin-top: .8rem; padding: .4rem .65rem; } .explain-button:disabled { cursor: wait; opacity: .7; }
.explanation { border-left: 3px solid #38bdf8; margin-top: .8rem; padding: .6rem .8rem; } .explanation p { margin: .3rem 0 .65rem; } .explanation-error { color: #fca5a5; font-size: .85rem; }
</style>
