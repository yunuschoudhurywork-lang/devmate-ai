<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import AnalysisSummary from "@/components/AnalysisSummary.vue";
import CodeEditor from "@/components/CodeEditor.vue";
import FindingsList from "@/components/FindingsList.vue";
import QualityScore from "@/components/QualityScore.vue";
import ReviewSummary from "@/components/ReviewSummary.vue";
import { analyzeCode, generateReviewSummary, getProjects, ApiError } from "@/services/api";
import type { AnalysisLanguage, AnalysisResult, Project, ReviewSummary as ReviewSummaryType } from "@/types/analysis";

const DEFAULT_PRESETS: Record<AnalysisLanguage, { filename: string; code: string }> = {
  javascript: {
    filename: "example.js",
    code: "const message = 'Hello, DevMate';\nconsole.log(message);"
  },
  typescript: {
    filename: "example.ts",
    code: "const message: string = 'Hello, DevMate';\nconsole.log(message);"
  },
  python: {
    filename: "example.py",
    code: "def main():\n    message = 'Hello, DevMate'\n    print(message)\n\nif __name__ == '__main__':\n    main()"
  },
  java: {
    filename: "Example.java",
    code: "public class Example {\n    public static void main(String[] args) {\n        String message = \"Hello, DevMate\";\n        System.out.println(message);\n    }\n}"
  }
};

const props = defineProps<{ projectId?: string }>();

const language = ref<AnalysisLanguage>("javascript");
const filename = ref("example.js");
const code = ref("const message = 'Hello, DevMate';\nconsole.log(message);");
const analysis = ref<AnalysisResult>();
const reportId = ref<string>();
const reviewSummary = ref<ReviewSummaryType>();
const projects = ref<Project[]>([]);
const selectedProjectId = ref<string>(props.projectId ?? "");
const loading = ref(false);
const summaryLoading = ref(false);
const error = ref("");
const summaryError = ref("");

watch(language, (newLang, oldLang) => {
  const oldPreset = oldLang ? DEFAULT_PRESETS[oldLang] : undefined;
  const newPreset = DEFAULT_PRESETS[newLang];
  if (!filename.value || (oldPreset && filename.value === oldPreset.filename)) {
    filename.value = newPreset.filename;
  }
  if (!code.value.trim() || (oldPreset && code.value.trim() === oldPreset.code.trim())) {
    code.value = newPreset.code;
  }
});

watch(
  () => props.projectId,
  (value) => {
    if (value) selectedProjectId.value = value;
  }
);

onMounted(async () => {
  try {
    projects.value = await getProjects();
  } catch {
    projects.value = [];
  }
});

async function runAnalysis(): Promise<void> {
  loading.value = true;
  error.value = "";
  reviewSummary.value = undefined;
  summaryError.value = "";
  reportId.value = undefined;

  try {
    const result = await analyzeCode({
      language: language.value,
      filename: filename.value || undefined,
      code: code.value,
      projectId: selectedProjectId.value || undefined
    });
    analysis.value = result.analysis;
    reportId.value = result.reportId;
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
    reviewSummary.value = (
      await generateReviewSummary({
        language: language.value,
        filename: filename.value || undefined,
        analysisResult: analysis.value,
        reportId: reportId.value
      })
    ).summary;
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
        <label>Language
          <select v-model="language">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </label>
        <label>Filename <input v-model="filename" placeholder="example.js" /></label>
        <label>Project
          <select v-model="selectedProjectId">
            <option value="">No project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </label>
        <button :disabled="loading" @click="runAnalysis">{{ loading ? "Analyzing…" : "Analyze code" }}</button>
      </div>

      <CodeEditor v-model="code" :language="language" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="reportId" class="saved">✓ Saved to your history.</p>
    </section>

    <aside class="results-panel">
      <template v-if="analysis">
        <QualityScore :quality="analysis.quality" />
        <AnalysisSummary :summary="analysis.summary" />
        <div class="summary-section">
          <button class="summary-button" :disabled="summaryLoading" @click="requestReviewSummary">
            {{ summaryLoading ? "Generating…" : "🤖 Generate AI Review Summary" }}
          </button>
          <p v-if="summaryError" class="error" role="alert">{{ summaryError }}</p>
        </div>
        <ReviewSummary v-if="reviewSummary" :summary="reviewSummary" />
      </template>

      <FindingsList
        :findings="analysis?.findings ?? []"
        :analyzed="Boolean(analysis)"
        :language="language"
        :filename="filename"
        :source-context="code"
        :report-id="reportId"
      />
    </aside>
  </main>
</template>

<style scoped>
.workspace { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.8fr); gap: 1.25rem; }
.editor-panel, .results-panel { min-width: 0; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-bottom: 0.75rem; }
label { display: grid; color: #94a3b8; font-size: 0.8rem; gap: 0.25rem; }
input, select { background: #172033; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; padding: 0.5rem; }
button { background: #0284c7; border: 0; border-radius: 6px; color: white; cursor: pointer; font-weight: 700; padding: 0.62rem 0.9rem; }
button:disabled { cursor: wait; opacity: 0.7; }
.results-panel { display: grid; align-content: start; gap: 1rem; }
.error { color: #fca5a5; }
.saved { color: #86efac; font-size: 0.8rem; margin-top: 0.5rem; }
.summary-section { display: grid; gap: 0.5rem; }
.summary-button { background: #0e7490; font-size: 0.9rem; }
@media (max-width: 850px) { .workspace { grid-template-columns: 1fr; } }
</style>
