<script setup lang="ts">
import type { ReviewSummary } from "@/types/analysis";

defineProps<{ summary: ReviewSummary }>();
</script>

<template>
  <section class="review-summary" aria-label="AI Review Summary">
    <div class="summary-header">
      <span class="sparkle">✨</span>
      <h2>AI Review Summary</h2>
    </div>

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
.review-summary {
  background: rgba(16, 11, 29, 0.85);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 0.5rem;
  backdrop-filter: blur(14px);
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  padding-bottom: 0.6rem;
}

.sparkle {
  color: #c084fc;
  font-size: 1.1rem;
}

h2 {
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
}

h3 {
  color: #c4b5fd;
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-content {
  display: grid;
  gap: 0.95rem;
}

.overview p {
  color: #f1f5f9;
  line-height: 1.5;
  margin: 0;
  font-size: 0.88rem;
}

.risks ul, .priorities ol {
  color: #e2e8f0;
  line-height: 1.6;
  margin: 0;
  padding-left: 1.3rem;
  font-size: 0.85rem;
}

.risks li {
  color: #fca5a5;
  margin-bottom: 0.35rem;
}

.priorities li {
  color: #e0e7ff;
  margin-bottom: 0.35rem;
}

.caveats {
  border-top: 1px solid rgba(139, 92, 246, 0.15);
  padding-top: 0.65rem;
}

.caveats small {
  color: #a5b4fc;
  font-size: 0.78rem;
  line-height: 1.4;
}
</style>
