<script setup lang="ts">
import { computed } from "vue";
import type { Finding, FindingType } from "@/types/analysis";

const props = defineProps<{ findings: Finding[]; analyzed: boolean }>();
const groups: Array<{ type: FindingType; title: string }> = [
  { type: "error", title: "🐞 Errors" },
  { type: "security", title: "🛡 Security" },
  { type: "performance", title: "⚡ Performance" }
];
const grouped = computed(() => groups.map((group) => ({ ...group, items: props.findings.filter((finding) => finding.type === group.type) })).filter((group) => group.items.length > 0));
</script>

<template>
  <section class="findings" aria-label="Analysis findings">
    <p v-if="!analyzed" class="empty">Run an analysis to see DevMate's findings.</p>
    <p v-else-if="findings.length === 0" class="empty success">✓ No issues detected.</p>
    <div v-for="group in grouped" :key="group.type" class="finding-group">
      <h3>{{ group.title }}</h3>
      <article v-for="finding in group.items" :key="`${finding.ruleId}-${finding.line}`" class="finding">
        <div class="finding-meta"><span :class="['badge', finding.severity]">{{ finding.severity }}</span><span>Line {{ finding.line }}</span><code>{{ finding.ruleId }}</code></div>
        <p>{{ finding.message }}</p>
        <small v-if="finding.suggestion">Suggestion: {{ finding.suggestion }}</small>
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
</style>
