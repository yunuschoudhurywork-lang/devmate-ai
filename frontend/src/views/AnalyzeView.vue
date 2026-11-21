<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import AnalysisSummary from "@/components/AnalysisSummary.vue";
import CodeEditor from "@/components/CodeEditor.vue";
import FindingsList from "@/components/FindingsList.vue";
import FlowGraphViewer from "@/components/FlowGraphViewer.vue";
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

const props = defineProps<{
  projectId?: string;
  initialCode?: string;
  initialFilename?: string;
  initialLanguage?: AnalysisLanguage;
}>();

const editorRef = ref<InstanceType<typeof CodeEditor>>();
const language = ref<AnalysisLanguage>(props.initialLanguage ?? "javascript");
const filename = ref(props.initialFilename ?? DEFAULT_PRESETS[language.value].filename);
const code = ref(props.initialCode ?? DEFAULT_PRESETS[language.value].code);
const analysis = ref<AnalysisResult>();
const reportId = ref<string>();
const reviewSummary = ref<ReviewSummaryType>();
const projects = ref<Project[]>([]);
const selectedProjectId = ref<string>(props.projectId ?? "");
const loading = ref(false);
const summaryLoading = ref(false);
const error = ref("");
const summaryError = ref("");

watch(
  () => props.initialCode,
  (newCode) => {
    if (newCode !== undefined) {
      code.value = newCode;
      if (props.initialLanguage) {
        language.value = props.initialLanguage;
      }
      if (props.initialFilename) {
        filename.value = props.initialFilename;
      }
      analysis.value = undefined;
      reportId.value = undefined;
      error.value = "";
    }
  }
);

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

const activeWorkspaceTab = ref<"editor" | "flow">("editor");

function onSelectFlowLine(line: number): void {
  activeWorkspaceTab.value = "editor";
  setTimeout(() => {
    editorRef.value?.goToLine(line);
  }, 50);
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

      <div class="workspace-mode-tabs">
        <button
          type="button"
          class="mode-tab-btn"
          :class="{ active: activeWorkspaceTab === 'editor' }"
          @click="activeWorkspaceTab = 'editor'"
        >
          <span class="tab-icon">💻</span>
          <span>Code Editor</span>
        </button>
        <button
          type="button"
          class="mode-tab-btn flow-tab"
          :class="{ active: activeWorkspaceTab === 'flow' }"
          @click="activeWorkspaceTab = 'flow'"
        >
          <span class="tab-icon">🗺️</span>
          <span>Control Flow & Vulnerability Map</span>
          <span v-if="(analysis?.findings?.length ?? 0) > 0" class="flow-tab-badge">
            {{ analysis?.findings?.length }}
          </span>
        </button>
      </div>

      <CodeEditor
        v-show="activeWorkspaceTab === 'editor'"
        ref="editorRef"
        v-model="code"
        :language="language"
        :findings="analysis?.findings ?? []"
      />

      <FlowGraphViewer
        v-if="activeWorkspaceTab === 'flow'"
        :code="code"
        :language="language"
        :findings="analysis?.findings ?? []"
        @select-line="onSelectFlowLine"
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
  background: rgba(2, 14, 8, 0.85);
  border: 1px solid rgba(16, 182, 127, 0.25);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  backdrop-filter: blur(14px);
}

label {
  display: grid;
  color: #6ee7b7;
  font-size: 0.78rem;
  gap: 0.3rem;
  font-weight: 500;
}

input, select {
  background: rgba(1, 10, 6, 0.9);
  border: 1px solid rgba(16, 182, 127, 0.25);
  border-radius: 8px;
  color: #f8fafc;
  padding: 0.55rem 0.75rem;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s ease;
}

input:focus, select:focus {
  border-color: #10b67f;
  box-shadow: 0 0 10px rgba(16, 182, 127, 0.35);
}

.btn-analyze {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: linear-gradient(135deg, #059669 0%, #10b67f 100%);
  border: 1px solid rgba(16, 182, 127, 0.5);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  padding: 0.65rem 1.15rem;
  box-shadow: 0 0 16px rgba(16, 182, 127, 0.4);
  transition: all 0.2s ease;
  margin-left: auto;
}

.btn-analyze:hover:not(:disabled) {
  box-shadow: 0 0 24px rgba(16, 182, 127, 0.7);
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
  background: linear-gradient(135deg, #047857 0%, #10b67f 100%);
  border: 1px solid rgba(16, 182, 127, 0.45);
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(16, 182, 127, 0.35);
  transition: all 0.2s ease;
}

.summary-button:hover:not(:disabled) {
  box-shadow: 0 0 24px rgba(16, 182, 127, 0.65);
  transform: translateY(-1px);
}

.summary-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.workspace-mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.3rem;
  border-radius: 8px;
  border: 1px solid rgba(103, 232, 249, 0.15);
  width: fit-content;
}

.mode-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.9rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tab-btn:hover {
  color: #67e8f9;
  background: rgba(103, 232, 249, 0.08);
}

.mode-tab-btn.active {
  background: #0f172a;
  color: #67e8f9;
  border: 1px solid #67e8f9;
  box-shadow: 0 0 10px rgba(103, 232, 249, 0.25);
  font-weight: 700;
}

.flow-tab-badge {
  background: #ef4444;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.05rem 0.4rem;
  border-radius: 10px;
}

:global(body.light-theme) .workspace-mode-tabs {
  background: #f4f0ea;
  border: 2px solid #000000;
}

:global(body.light-theme) .mode-tab-btn {
  color: #18181b;
}

:global(body.light-theme) .mode-tab-btn.active {
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.3);
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
}
</style>
