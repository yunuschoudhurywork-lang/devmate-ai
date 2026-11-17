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

const editorRef = ref<InstanceType<typeof CodeEditor>>();
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

function onSelectLine(line: number): void {
  editorRef.value?.goToLine(line);
}

async function runAnalysis(): Promise<void> {
  loading.value = true;
  error.value = "";
  reviewSummary.value = undefined;
  summaryError.value = "";
  reportId.value = undefined;

  try {
    const response = await analyzeCode({
      language: language.value,
      filename: filename.value || undefined,
      code: code.value,
      projectId: selectedProjectId.value || undefined
    });
    analysis.value = response.analysis;
    reportId.value = response.reportId;
  } catch (caught) {
    analysis.value = undefined;
    error.value = caught instanceof ApiError ? caught.message : "An unexpected error occurred during analysis.";
  } finally {
    loading.value = false;
  }
}

async function requestReviewSummary(): Promise<void> {
  if (!analysis.value) return;

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
        <label>
          <span>Language</span>
          <select v-model="language">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </label>
        <label>
          <span>Filename</span>
          <input v-model="filename" placeholder="example.js" />
        </label>
        <label>
          <span>Project</span>
          <select v-model="selectedProjectId">
            <option value="">No project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </label>
        <button class="btn-analyze" :disabled="loading" @click="runAnalysis">
          <span class="btn-icon">⚡</span>
          <span>{{ loading ? "Analyzing…" : "Analyze code" }}</span>
        </button>
      </div>

      <CodeEditor
        ref="editorRef"
        v-model="code"
        :language="language"
        :findings="analysis?.findings ?? []"
      />

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="reportId" class="saved">✓ Analysis saved to your history.</p>
    </section>

    <aside class="results-panel">
      <template v-if="analysis">
        <QualityScore :quality="analysis.quality" />
        <AnalysisSummary :summary="analysis.summary" />
        <div class="summary-section">
          <button class="summary-button" :disabled="summaryLoading" @click="requestReviewSummary">
            <span>✨</span>
            <span>{{ summaryLoading ? "Generating AI Summary…" : "🤖 Generate AI Review Summary" }}</span>
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
        @select-line="onSelectLine"
      />
    </aside>
  </main>
</template>

<style scoped>
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 1fr);
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 1440px;
  margin: 0 auto;
}

.editor-panel, .results-panel {
  min-width: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: flex-end;
  margin-bottom: 0.85rem;
  background: rgba(16, 11, 29, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  backdrop-filter: blur(14px);
}

label {
  display: grid;
  color: #a5b4fc;
  font-size: 0.78rem;
  gap: 0.3rem;
  font-weight: 500;
}

input, select {
  background: rgba(10, 7, 20, 0.85);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 8px;
  color: #f8fafc;
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s ease;
}

input:focus, select:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
}

.btn-analyze {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.65rem 1.15rem;
  box-shadow: 0 0 16px rgba(124, 58, 237, 0.4);
  transition: all 0.2s ease;
  margin-left: auto;
}

.btn-analyze:hover:not(:disabled) {
  box-shadow: 0 0 24px rgba(168, 85, 247, 0.7);
  transform: translateY(-1px);
}

.btn-analyze:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-icon {
  font-size: 0.9rem;
}

.results-panel {
  display: grid;
  align-content: start;
  gap: 1.25rem;
}

.error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  margin-top: 0.6rem;
}

.saved {
  color: #34d399;
  font-size: 0.82rem;
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.summary-section {
  display: grid;
  gap: 0.5rem;
}

.summary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #9333ea 0%, #6366f1 100%);
  border: 1px solid rgba(168, 85, 247, 0.4);
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(147, 51, 234, 0.35);
  transition: all 0.2s ease;
}

.summary-button:hover:not(:disabled) {
  box-shadow: 0 0 24px rgba(168, 85, 247, 0.65);
  transform: translateY(-1px);
}

.summary-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
</style>
