<script setup lang="ts">
import type { AnalysisResult } from "@/types/analysis";
defineProps<{ quality: AnalysisResult["quality"] }>();
</script>

<template>
  <section class="card quality" aria-label="Quality score">
    <div class="overall"><span>Overall</span><strong>{{ quality.overall }}</strong><small>/100</small></div>
    <div class="score-row"><span>Correctness</span><b>{{ quality.categories.correctness }}</b></div>
    <div class="score-row"><span>Security</span><b>{{ quality.categories.security }}</b></div>
    <div class="score-row"><span>Performance</span><b>{{ quality.categories.performance }}</b></div>
  </section>
</template>

<style scoped>
.quality { display: grid; gap: .7rem; }
.overall { display: flex; align-items: baseline; gap: .4rem; } .overall strong { color: #38bdf8; font-size: 2.4rem; } .overall span { color: #94a3b8; }
.score-row { display: flex; justify-content: space-between; color: #cbd5e1; } .score-row b { color: #f8fafc; }
</style>
