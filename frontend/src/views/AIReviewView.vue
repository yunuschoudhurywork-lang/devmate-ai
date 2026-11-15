<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  ApiError,
  deleteAiArtifact,
  getAiArtifacts,
  getReport,
  getReportsList,
  runAiTask
} from "@/services/api";
import type {
  AiArtifactSummary,
  AiBugResult,
  AiPrCommentsResult,
  AiRefactorResult,
  AiReviewResult,
  AiSecurityResult,
  AiTaskKind,
  Finding,
  ReportListItem
} from "@/types/analysis";

type AnyResult = Partial<
  AiReviewResult & AiPrCommentsResult & AiSecurityResult & AiRefactorResult & AiBugResult
>;

const TASKS: Array<{ id: AiTaskKind; label: string; hint: string }> = [
  { id: "review", label: "Code review", hint: "A human-like overall review with a verdict" },
  { id: "pr-comments", label: "PR comments", hint: "Inline, line-anchored review comments" },
  { id: "security-fixes", label: "Security fixes", hint: "Exploit paths and remediation steps" },
  { id: "refactor", label: "Refactoring", hint: "Structural improvements with steps" },
  { id: "bug-explanations", label: "Bug explanations", hint: "Root cause and fix for each finding" }
];

const SAMPLE_CODE = `const apiKey = "sk_live_123456";
const url = "http://api.example.com/data";

export async function loadUsers(ids: string[]) {
  const results = [];
  for (const id of ids) {
    for (const other of ids) {
      if (ids.includes(other)) {
        results.push({ id, other });
      }
    }
  }
  return fetch(url + "?key=" + apiKey).then((r) => r.json());
}`;

const code = ref("");
const language = ref("javascript");
const filename = ref("example.js");
const task = ref<AiTaskKind>("review");
const findings = ref<Finding[]>([]);
const reports = ref<ReportListItem[]>([]);
const selectedReportId = ref("");

const loading = ref(false);
const error = ref("");
const result = ref<AnyResult | null>(null);
const meta = ref<{ provider: string; model: string } | null>(null);
const artifacts = ref<AiArtifactSummary[]>([]);

onMounted(async () => {
  try {
    const list = await getReportsList(1, 50);
    reports.value = list.reports;
  } catch {
    reports.value = [];
  }
  await loadArtifacts();
});

async function loadArtifacts(): Promise<void> {
  try {
    artifacts.value = await getAiArtifacts(12);
  } catch {
    artifacts.value = [];
  }
}

async function attachReport(): Promise<void> {
  if (!selectedReportId.value) return;

  try {
    const report = await getReport(selectedReportId.value);
    findings.value = report.report.analysis.findings;
    language.value = report.report.language;
    filename.value = report.report.filename || filename.value;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load the report.";
  }
}

async function run(): Promise<void> {
  if (!code.value.trim()) {
    error.value = "Paste the code you want reviewed first.";
    return;
  }

  loading.value = true;
  error.value = "";
  result.value = null;

  try {
    const response = await runAiTask(task.value, {
      language: language.value,
      filename: filename.value || undefined,
      code: code.value,
      findings: findings.value,
      reportId: selectedReportId.value || undefined
    });

    result.value = response.result as AnyResult;
    meta.value = { provider: response.provider, model: response.model };
    await loadArtifacts();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "The AI request failed.";
  } finally {
    loading.value = false;
  }
}

async function openArtifact(artifact: AiArtifactSummary): Promise<void> {
  result.value = artifact.content as AnyResult;
  meta.value = { provider: artifact.provider, model: artifact.model };
  task.value = artifact.kind as AiTaskKind;
}

async function removeArtifact(artifactId: string): Promise<void> {
  if (!confirm("Delete this AI artifact?")) return;
  try {
    await deleteAiArtifact(artifactId);
    await loadArtifacts();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to delete the artifact.";
  }
}

function useSample(): void {
  code.value = SAMPLE_CODE;
  filename.value = "example.js";
  language.value = "javascript";
  findings.value = [];
}
</script>

<template>
  <main class="ai-review">
    <section class="workspace">
      <article class="panel editor-panel">
        <header class="panel-header">
          <h2>Source code</h2>
          <button class="link-button" @click="useSample">Load example</button>
        </header>

        <div class="controls">
          <label>Language
            <select v-model="language">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
            </select>
          </label>
          <label>Filename <input v-model="filename" placeholder="example.js" /></label>
          <label class="grow">Findings from a saved report
            <span class="inline">
              <select v-model="selectedReportId">
                <option value="">No report attached</option>
                <option v-for="report in reports" :key="report.id" :value="report.id">
                  {{ report.filename || "Untitled" }} · {{ report.overallScore }} · {{ new Date(report.createdAt).toLocaleDateString() }}
                </option>
              </select>
              <button class="secondary" :disabled="!selectedReportId" @click="attachReport">Attach</button>
            </span>
          </label>
        </div>

        <textarea v-model="code" spellcheck="false" placeholder="Paste code here…" aria-label="Code to review"></textarea>

        <p v-if="findings.length > 0" class="attached">✓ {{ findings.length }} findings attached from the selected report.</p>

        <div class="tasks">
          <button
            v-for="option in TASKS"
            :key="option.id"
            :class="['task', { active: task === option.id }]"
            :title="option.hint"
            @click="task = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <button class="primary" :disabled="loading" @click="run">
          {{ loading ? "Calling the AI provider…" : "Run AI review" }}
        </button>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </article>

      <article class="panel result-panel">
        <header class="panel-header">
          <h2>Result</h2>
          <span v-if="meta" class="muted">{{ meta.provider }} · {{ meta.model }}</span>
        </header>

        <p v-if="!result && !loading" class="muted">Run a task to see the generated review.</p>
        <p v-if="loading" class="muted">Waiting for the model…</p>

        <template v-if="result">
          <div v-if="result.summary" class="summary-block">
            <span v-if="result.verdict" class="verdict">{{ result.verdict.replace(/_/g, " ") }}</span>
            <p>{{ result.summary }}</p>
          </div>

          <div v-if="result.strengths && result.strengths.length > 0" class="block">
            <h3>Strengths</h3>
            <ul><li v-for="(item, index) in result.strengths" :key="index">{{ item }}</li></ul>
          </div>

          <div v-if="result.concerns && result.concerns.length > 0" class="block">
            <h3>Concerns</h3>
            <div v-for="(concern, index) in result.concerns" :key="index" class="concern">
              <div class="concern-head">
                <strong>{{ concern.title }}</strong>
                <span :class="['chip', concern.severity]">{{ concern.severity }}</span>
                <span v-if="concern.line" class="muted">line {{ concern.line }}</span>
              </div>
              <p>{{ concern.detail }}</p>
            </div>
          </div>

          <div v-if="result.nextSteps && result.nextSteps.length > 0" class="block">
            <h3>Next steps</h3>
            <ol><li v-for="(step, index) in result.nextSteps" :key="index">{{ step }}</li></ol>
          </div>

          <div v-if="result.comments" class="block">
            <h3>PR comments ({{ result.comments.length }})</h3>
            <p v-if="result.comments.length === 0" class="muted">Nothing worth flagging in this file.</p>
            <div v-for="(comment, index) in result.comments" :key="index" class="comment">
              <div class="concern-head">
                <code>{{ comment.path }}:{{ comment.line }}</code>
                <span :class="['chip', comment.severity]">{{ comment.severity }}</span>
              </div>
              <p class="pre-line">{{ comment.body }}</p>
            </div>
          </div>

          <div v-if="result.fixes" class="block">
            <h3>Security fixes ({{ result.fixes.length }})</h3>
            <div v-for="(fix, index) in result.fixes" :key="index" class="comment">
              <div class="concern-head">
                <strong>{{ fix.title }}</strong>
                <span :class="['chip', fix.severity]">{{ fix.severity }}</span>
                <span v-if="fix.category" class="muted">{{ fix.category }}</span>
              </div>
              <p>{{ fix.explanation }}</p>
              <p><strong>Fix:</strong> {{ fix.remediation }}</p>
              <pre v-if="fix.codeExample">{{ fix.codeExample }}</pre>
            </div>
          </div>

          <div v-if="result.recommendations" class="block">
            <h3>Refactorings ({{ result.recommendations.length }})</h3>
            <div v-for="(recommendation, index) in result.recommendations" :key="index" class="comment">
              <div class="concern-head">
                <strong>{{ recommendation.title }}</strong>
                <span v-if="recommendation.impact" class="chip low">impact: {{ recommendation.impact }}</span>
                <span v-if="recommendation.effort" class="chip medium">effort: {{ recommendation.effort }}</span>
              </div>
              <p>{{ recommendation.rationale }}</p>
              <ol><li v-for="(step, stepIndex) in recommendation.steps" :key="stepIndex">{{ step }}</li></ol>
            </div>
          </div>

          <div v-if="result.explanations" class="block">
            <h3>Bug explanations ({{ result.explanations.length }})</h3>
            <div v-for="(entry, index) in result.explanations" :key="index" class="comment">
              <div class="concern-head">
                <strong>{{ entry.title }}</strong>
                <span v-if="entry.line" class="muted">line {{ entry.line }}</span>
              </div>
              <p><strong>Root cause:</strong> {{ entry.rootCause }}</p>
              <p>{{ entry.explanation }}</p>
              <p><strong>Fix:</strong> {{ entry.fix }}</p>
              <p class="muted">Test: {{ entry.testSuggestion }}</p>
            </div>
          </div>
        </template>
      </article>
    </section>

    <section class="panel artifacts">
      <header class="panel-header">
        <h2>Saved AI artifacts</h2>
        <span class="muted">{{ artifacts.length }} most recent</span>
      </header>
      <p v-if="artifacts.length === 0" class="muted">Generated reviews, PR comments and fixes are saved here.</p>
      <div v-for="artifact in artifacts" :key="artifact.id" class="artifact">
        <button class="artifact-main" @click="openArtifact(artifact)">
          <strong>{{ artifact.title }}</strong>
          <small>{{ artifact.provider }} · {{ artifact.model }} · {{ new Date(artifact.createdAt).toLocaleString() }}</small>
        </button>
        <span class="tag">{{ artifact.kind }}</span>
        <button class="delete" title="Delete artifact" @click="removeArtifact(artifact.id)">✕</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ai-review { display: grid; gap: 1rem; }
.workspace { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
.panel { background: rgba(23, 32, 51, 0.85); border: 1px solid #293750; border-radius: 12px; padding: 1.1rem; display: grid; gap: 0.9rem; align-content: start; }
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.panel-header h2 { color: #e2e8f0; font-size: 1rem; margin: 0; }
.muted { color: #94a3b8; font-size: 0.8rem; margin: 0; }
.link-button { background: transparent; border: 0; color: #38bdf8; cursor: pointer; font-size: 0.8rem; }
.controls { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
.controls .grow { grid-column: 1 / -1; }
label { display: grid; gap: 0.3rem; color: #94a3b8; font-size: 0.75rem; }
.inline { display: flex; gap: 0.4rem; }
.inline select { flex: 1; }
input, select, textarea { background: #0f1729; border: 1px solid #334155; border-radius: 7px; color: #f8fafc; padding: 0.5rem 0.6rem; font-size: 0.85rem; font-family: inherit; }
textarea { min-height: 300px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; line-height: 1.5; }
input:focus, select:focus, textarea:focus { outline: 2px solid rgba(56, 189, 248, 0.4); border-color: #38bdf8; }
.attached { color: #86efac; font-size: 0.78rem; margin: 0; }
.tasks { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.task { background: #0f1729; border: 1px solid #334155; border-radius: 999px; color: #cbd5e1; cursor: pointer; font-size: 0.78rem; padding: 0.4rem 0.75rem; }
.task.active { background: #0e7490; border-color: #38bdf8; color: #ecfeff; }
.primary { background: #fbbf24; border: 0; border-radius: 8px; color: #0b0c0e; cursor: pointer; font-weight: 700; padding: 0.7rem; }
.primary:disabled { opacity: 0.6; cursor: wait; }
.secondary { background: transparent; border: 1px solid #334155; border-radius: 7px; color: #e2e8f0; cursor: pointer; padding: 0.5rem 0.7rem; font-size: 0.8rem; }
.secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.error { color: #fca5a5; font-size: 0.82rem; margin: 0; }

.result-panel { max-height: 78vh; overflow: auto; }
.summary-block { background: #0f1729; border-radius: 8px; padding: 0.8rem; display: grid; gap: 0.5rem; }
.summary-block p { color: #cbd5e1; margin: 0; line-height: 1.55; font-size: 0.86rem; }
.verdict { background: #1e3a5f; border-radius: 999px; color: #7dd3fc; font-size: 0.7rem; padding: 0.2rem 0.6rem; text-transform: capitalize; width: fit-content; }
.block h3 { color: #e2e8f0; font-size: 0.86rem; margin: 0 0 0.5rem; }
.block ul, .block ol { color: #cbd5e1; font-size: 0.82rem; line-height: 1.6; margin: 0; padding-left: 1.3rem; }
.concern, .comment { background: #0f1729; border: 1px solid #22304a; border-radius: 8px; padding: 0.7rem; display: grid; gap: 0.4rem; margin-bottom: 0.5rem; }
.concern p, .comment p { color: #cbd5e1; font-size: 0.82rem; line-height: 1.55; margin: 0; }
.concern-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; color: #e2e8f0; font-size: 0.85rem; }
.chip { border-radius: 999px; font-size: 0.65rem; padding: 0.12rem 0.5rem; text-transform: uppercase; background: #1e3a5f; color: #bfdbfe; }
.chip.high, .chip.critical, .chip.blocker { background: #7f1d1d; color: #fecaca; }
.chip.medium, .chip.issue { background: #78350f; color: #fde68a; }
.chip.low, .chip.nit { background: #1e3a5f; color: #bfdbfe; }
.chip.info { background: #14532d; color: #bbf7d0; }
.pre-line { white-space: pre-line; }
pre { background: #060a12; border-radius: 6px; color: #a5f3fc; font-size: 0.75rem; margin: 0; overflow-x: auto; padding: 0.6rem; white-space: pre-wrap; }
code { color: #7dd3fc; font-size: 0.78rem; }

.artifacts .artifact { display: flex; align-items: center; gap: 0.6rem; }
.artifact-main { background: transparent; border: 0; cursor: pointer; display: grid; gap: 0.15rem; flex: 1; text-align: left; min-width: 0; }
.artifact-main strong { color: #e2e8f0; font-size: 0.83rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artifact-main small { color: #64748b; font-size: 0.7rem; }
.tag { background: #1e3a5f; border-radius: 999px; color: #7dd3fc; font-size: 0.66rem; padding: 0.15rem 0.5rem; white-space: nowrap; }
.delete { background: transparent; border: 0; color: #64748b; cursor: pointer; font-size: 0.85rem; }
.delete:hover { color: #fca5a5; }

@media (max-width: 1000px) {
  .workspace { grid-template-columns: 1fr; }
  .result-panel { max-height: none; }
}
</style>
