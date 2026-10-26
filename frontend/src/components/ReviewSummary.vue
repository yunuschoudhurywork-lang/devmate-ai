<script setup lang="ts">
import type { ReviewSummary } from "@/types/analysis";

defineProps<{ summary: ReviewSummary }>();
</script>

<template>
  <section class="review-summary" aria-label="AI Review Summary">
    <h2>🤖 AI Review Summary</h2>
    <div class="summary-content">
      <div class="overview">
        <h3>Overview</h3>
        <p>{{ summary.summary }}</p>
      </div>

      <div v-if="summary.keyRisks.length > 0" class="risks">
        <h3>Key Risks</h3>
        <ul>
          <li v-for="(risk, index) in summary.keyRisks" :key="index">{{ risk }}</li>
        </ul>
      </div>

      <div class="priorities">
        <h3>Recommended Priorities</h3>
        <ol>
          <li v-for="(priority, index) in summary.priorities" :key="index">{{ priority }}</li>
        </ol>
      </div>

      <div v-if="summary.caveats" class="caveats">
        <small>⚠️ {{ summary.caveats }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.review-summary { background: #0f1729; border: 2px solid #0ea5e9; border-radius: 10px; padding: 1.2rem; margin-bottom: 1rem; }
h2 { color: #38bdf8; font-size: 1.1rem; margin: 0 0 .85rem; }
h3 { color: #e2e8f0; font-size: .95rem; margin: 0 0 .5rem; }
.summary-content { display: grid; gap: .85rem; }
.overview p { color: #cbd5e1; line-height: 1.5; margin: 0; }
.risks ul, .priorities ol { color: #cbd5e1; line-height: 1.6; margin: 0; padding-left: 1.4rem; }
.risks li, .priorities li { margin-bottom: .4rem; }
.caveats { border-top: 1px solid #1e3a5f; padding-top: .65rem; }
.caveats small { color: #94a3b8; }
</style>
