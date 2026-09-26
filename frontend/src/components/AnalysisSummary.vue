<script setup lang="ts">
import type { AnalysisResult } from "@/types/analysis";
defineProps<{ summary: AnalysisResult["summary"] }>();
</script>

<template>
  <section class="card summary" aria-label="Analysis summary">
    <span><strong>{{ summary.total }}</strong> total</span>
    <span><strong>{{ summary.errors }}</strong> errors</span>
    <span><strong>{{ summary.warnings }}</strong> warnings</span>
    <span><strong>{{ summary.security }}</strong> security</span>
    <span><strong>{{ summary.performance }}</strong> performance</span>
  </section>
</template>
