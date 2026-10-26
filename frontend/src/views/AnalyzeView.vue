<script setup lang="ts">
import { ref, watch } from "vue";
import AnalysisSummary from "@/components/AnalysisSummary.vue";
import CodeEditor from "@/components/CodeEditor.vue";
import FindingsList from "@/components/FindingsList.vue";
import QualityScore from "@/components/QualityScore.vue";
import ReviewSummary from "@/components/ReviewSummary.vue";
import { analyzeCode, generateReviewSummary, ApiError } from "@/services/api";
import type { AnalysisLanguage, AnalysisResult, ReviewSummary as ReviewSummaryType } from "@/types/analysis";

const language = ref<AnalysisLanguage>("javascript");
const filename = ref("example.js");
const code = ref("const message = 'Hello, DevMate';\nconsole.log(message);");
const analysis = ref<AnalysisResult>();
const reviewSummary = ref<ReviewSummaryType>();
const loading = ref(false);
const summaryLoading = ref(false);
const error = ref("");
const summaryError = ref("");

watch(language, (value) => { filename.value = value === "javascript" ? "example.js" : "example.ts"; });

async function runAnalysis(): Promise<void> {
  loading.value = true;
  error.value = "";
  reviewSummary.value = undefined;
  summaryError.value = "";
  try {
    analysis.value = (await analyzeCode({ language: language.value, filename: filename.value || undefined, code: code.value })).analysis;
  } catch (caught) {
    analysis.value = undefined;
    error.value = caught instanceof ApiError ? caught.message : "An unexpected error occurred while requesting analysis.";
  } finally {
    loading.value = false;
  }
}

async function requestReviewSummary(): Promise<void> {
  if (!analysis.value || summaryLoading.value) return;
  summaryLoading.value = true;
  summaryError.value = "";
  try {
    reviewSummary.value = (await generateReviewSummary({
      language: language.value,
      filename: filename.value || undefined,
      analysisResult: analysis.value
    })).summary;
  } catch (caught) {
    summaryError.value = caught instanceof ApiError ? caught.message : "An unexpected error occurred while requesting a review summary.";
  } finally {
    summaryLoading.value = false;
  }
}
</script>

<template>
  <main class="workspace">
    <section class="editor-panel">
      <div class="toolbar">
        <label>Language <select v-model="language"><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option></select></label>
        <label>Filename <input v-model="filename" placeholder="example.js" /></label>
        <button :disabled="loading" @click="runAnalysis">{{ loading ? "Analyzing…" : "Analyze code" }}</button>
      </div>
      <CodeEditor v-model="code" :language="language" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>
    <aside class="results-panel">
      <template v-if="analysis">
        <QualityScore :quality="analysis.quality" />
        <AnalysisSummary :summary="analysis.summary" />
        <div class="summary-section">
          <button
            class="summary-button"
            :disabled="summaryLoading"
            @click="requestReviewSummary"
          >
            {{ summaryLoading ? "Generating…" : "🤖 Generate AI Review Summary" }}
          </button>
          <p v-if="summaryError" class="error" role="alert">{{ summaryError }}</p>
        </div>
        <ReviewSummary v-if="reviewSummary" :summary="reviewSummary" />
      </template>
      <FindingsList :findings="analysis?.findings ?? []" :analyzed="Boolean(analysis)" :language="language" :filename="filename" :source-context="code" />
    </aside>
  </main>
</template>

<style scoped>
.workspace { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, .8fr); gap: 1.25rem; } .editor-panel, .results-panel { min-width: 0; }
.toolbar { display: flex; flex-wrap: wrap; gap: .75rem; align-items: end; margin-bottom: .75rem; } label { display: grid; color: #94a3b8; font-size: .8rem; gap: .25rem; }
input, select { background: #172033; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; padding: .5rem; } button { background: #0284c7; border: 0; border-radius: 6px; color: white; cursor: pointer; font-weight: 700; padding: .62rem .9rem; } button:disabled { cursor: wait; opacity: .7; }
.results-panel { display: grid; align-content: start; gap: 1rem; } .error { color: #fca5a5; }
.summary-section { display: grid; gap: .5rem; }
.summary-button { background: #0e7490; font-size: .9rem; }
@media (max-width: 850px) { .workspace { grid-template-columns: 1fr; } .editor { height: 360px; } }
</style>
