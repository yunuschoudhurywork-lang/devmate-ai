<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ApiError, getDashboard } from "@/services/api";
import { detectLanguage, detectLanguageFromContent, getExtensionForLanguage } from "@/utils/languageDetector";
import type { AnalysisLanguage, DashboardData } from "@/types/analysis";
import type { ViewId } from "@/types/navigation";

const emit = defineEmits<{
  navigate: [view: ViewId];
  "analyze-code": [payload: { code: string; filename?: string; language?: AnalysisLanguage }];
}>();

const data = ref<DashboardData | null>(null);
const loading = ref(true);
const error = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const maxTrend = computed(() => {
  const scores = data.value?.scoreTrend.map((point) => point.averageScore ?? 0) ?? [0];
  return Math.max(1, ...scores);
});

function processFile(file: File): void {
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE) {
    alert(`File "${file.name}" exceeds 2MB limit for browser analysis.`);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = (e.target?.result as string) ?? "";
    const language = detectLanguage(file.name, content);
    emit("analyze-code", {
      code: content,
      filename: file.name,
      language
    });
  };
  reader.onerror = () => {
    alert(`Failed to read "${file.name}".`);
  };
  reader.readAsText(file);
}

function triggerFilePicker(): void {
  fileInputRef.value?.click();
}

function onFileInputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
  target.value = "";
}

function onDrop(event: DragEvent): void {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
    return;
  }
  const text = event.dataTransfer?.getData("text");
  if (text && text.trim().length > 0) {
    const lang = detectLanguageFromContent(text);
    const ext = getExtensionForLanguage(lang);
    emit("analyze-code", {
      code: text,
      filename: `dropped.${ext}`,
      language: lang
    });
  }
}

async function handlePaste(): Promise<void> {
  let text = "";
  try {
    if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
      text = await navigator.clipboard.readText();
    }
  } catch (err) {
    console.warn("Clipboard read was not allowed or failed:", err);
  }

  if (!text || text.trim().length === 0) {
    const fallback = window.prompt("Paste your code here:");
    if (fallback && fallback.trim().length > 0) {
      text = fallback;
    }
  }

  if (text && text.trim().length > 0) {
    const language = detectLanguageFromContent(text);
    const ext = getExtensionForLanguage(language);
    emit("analyze-code", {
      code: text,
      filename: `pasted.${ext}`,
      language
    });
  } else {
    emit("navigate", "analyze");
  }
}

function onWindowKeyDown(e: KeyboardEvent): void {
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    e.preventDefault();
    void handlePaste();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
    e.preventDefault();
    triggerFilePicker();
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onWindowKeyDown);
  try {
    data.value = await getDashboard();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load dashboard data.";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", onWindowKeyDown);
});

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function scoreClass(score: number): string {
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "poor";
}
</script>

<template>
  <main class="dashboard">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>Loading dashboard…</span>
    </div>

    <template v-else-if="data">
      <!-- Retro Neo-Brutalist Hero Section (Inspired by Jellykit) -->
      <section class="brutalist-hero">
        <!-- Left Side: Massive Typography & Metric Bar -->
        <div class="hero-left">
          <div class="hero-eyebrow">
            <span class="eyebrow-dot"></span>
            <span>DEVMATE · RUNS IN YOUR BROWSER</span>
          </div>

          <h1 class="hero-headline">
            EVERYTHING<br />
            YOU NEED.<br />
            RIGHT IN YOUR<br />
            <span class="headline-highlight-box">BROWSER.</span>
          </h1>

          <p class="hero-desc">
            JavaScript. TypeScript. Python. Java. Code. <strong>All processed directly inside your browser</strong>, your code never leaves this device unless requested.
          </p>

          <div class="hero-metrics-bar">
            <div class="metric-col">
              <span class="m-label">ANALYSES</span>
              <strong class="m-value">{{ data.stats.reports }}</strong>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-col">
              <span class="m-label">PROJECTS</span>
              <strong class="m-value">{{ data.stats.projects }}</strong>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-col">
              <span class="m-label">AVG QUALITY</span>
              <strong class="m-value" :class="scoreClass(data.stats.averageScore)">{{ data.stats.averageScore }}</strong>
            </div>
          </div>
        </div>

        <!-- Right Side: Big Sunshine Yellow Card from screenshot -->
        <div class="hero-right">
          <input
            ref="fileInputRef"
            type="file"
            accept=".js,.jsx,.ts,.tsx,.mjs,.cjs,.py,.pyw,.java,.txt,.json,.md"
            class="hidden-file-input"
            @change="onFileInputChange"
          />

          <div
            class="yellow-drop-card"
            :class="{ 'is-dragging': isDragging }"
            @click="triggerFilePicker"
            @dragover.prevent="isDragging = true"
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <div class="drop-top-row">
              <button
                type="button"
                class="square-plus-btn"
                title="Choose a file to analyze"
                aria-label="Upload file"
                @click.stop="triggerFilePicker"
              >
                +
              </button>
              <span class="universal-drop-tag">UNIVERSAL DROP</span>
            </div>

            <div class="drop-center">
              <h2 class="drop-title">DROP ANYTHING</h2>
              <p class="drop-subtitle">{{ isDragging ? 'Release to upload and analyze!' : "We'll figure out what it is." }}</p>

              <div class="format-pills">
                <span class="f-pill">JS</span>
                <span class="f-pill">TS</span>
                <span class="f-pill">PYTHON</span>
                <span class="f-pill">JAVA</span>
                <span class="f-pill">LINTER</span>
                <span class="f-pill">SECURITY</span>
                <span class="f-pill">AI</span>
              </div>
            </div>

            <div class="drop-actions">
              <button
                type="button"
                class="btn-drop-dark"
                title="Select a local file from your computer"
                @click.stop="triggerFilePicker"
              >
                Choose file
              </button>
              <button
                type="button"
                class="btn-drop-white"
                title="Paste code from clipboard (Ctrl+V)"
                @click.stop="handlePaste"
              >
                <span>📋 Paste</span>
                <span class="mini-keycap">Ctrl</span>
                <span class="mini-keycap">V</span>
              </button>
            </div>

            <div class="drop-footer">
              <span class="footer-green-dot"></span>
              <span>NOTHING LEAVES THIS DEVICE</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Kestra-inspired Pipeline Flow Banner -->
      <section class="pipeline-card">
        <header class="pipeline-header">
          <div class="pipeline-title">
            <span class="sparkle">✦</span>
            <span class="pipeline-path">devmate.engine <strong>/ automated_code_review</strong></span>
          </div>
          <div class="pipeline-badges">
            <span class="badge-pill">🛡️ Deterministic</span>
            <span class="badge-pill">⚡ Multi-Language</span>
            <span class="badge-pill active-pill">🤖 AI Engine</span>
          </div>
        </header>

        <div class="pipeline-flow">
          <div class="flow-step">
            <div class="step-icon">⚡</div>
            <div class="step-content">
              <span class="step-tag">Source</span>
              <strong>Code Ingest</strong>
              <small>JS · TS · PY · JAVA</small>
            </div>
          </div>

          <div class="flow-connector">┄▸</div>

          <div class="flow-step">
            <div class="step-icon">🔍</div>
            <div class="step-content">
              <span class="step-tag">AST Linter</span>
              <strong>Syntax & Errors</strong>
              <small>ESLint & Parsers</small>
            </div>
          </div>

          <div class="flow-connector">┄▸</div>

          <div class="flow-step active-step">
            <div class="step-icon active-icon">🤖</div>
            <div class="step-content">
              <span class="step-tag active-tag">AI Agent</span>
              <strong>AI Review Engine</strong>
              <small>Fixes & Explanations</small>
            </div>
          </div>

          <div class="flow-connector">┄▸</div>

          <div class="flow-step">
            <div class="step-icon">🛡️</div>
            <div class="step-content">
              <span class="step-tag">Security</span>
              <strong>Vulnerability</strong>
              <small>Injection & Secrets</small>
            </div>
          </div>

          <div class="flow-connector">┄▸</div>

          <div class="flow-step">
            <div class="step-icon">📊</div>
            <div class="step-content">
              <span class="step-tag">Metrics</span>
              <strong>Quality Score</strong>
              <small>Database Stored</small>
            </div>
          </div>
        </div>
      </section>

      <!-- Stat Grid -->
      <section class="stat-grid">
        <article class="stat-card">
          <span class="stat-label">Analyses</span>
          <strong>{{ data.stats.reports }}</strong>
          <small>saved reports</small>
        </article>
        <article class="stat-card">
          <span class="stat-label">Projects</span>
          <strong>{{ data.stats.projects }}</strong>
          <small>tracked repositories</small>
        </article>
        <article class="stat-card">
          <span class="stat-label">Average quality</span>
          <strong :class="scoreClass(data.stats.averageScore)">{{ data.stats.averageScore }}</strong>
          <small>across all analyses</small>
        </article>
        <article class="stat-card">
          <span class="stat-label">AI artifacts</span>
          <strong>{{ data.stats.artifacts }}</strong>
          <small>saved reviews and fixes</small>
        </article>
      </section>

      <!-- Panel Grid: Trend & Category -->
      <section class="panel-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>Quality trend</h2>
            <span class="muted">last {{ data.scoreTrend.length }} days</span>
          </header>
          <div class="trend">
            <div
              v-for="point in data.scoreTrend"
              :key="point.date"
              class="trend-column"
              :title="`${point.date}: ${point.reports} analyses`"
            >
              <div class="trend-bar">
                <div
                  class="trend-fill"
                  :style="{
                    height: `${point.averageScore === null ? 0 : Math.round((point.averageScore / maxTrend) * 100)}%`
                  }"
                ></div>
              </div>
              <span class="trend-label">{{ point.date.slice(5) }}</span>
            </div>
          </div>
          <p v-if="data.stats.reports === 0" class="muted">No analyses yet — run your first one to start the trend.</p>
        </article>

        <article class="panel">
          <header class="panel-header">
            <h2>Category averages</h2>
          </header>
          <div
            class="category-row"
            v-for="category in (['correctness', 'security', 'performance'] as const)"
            :key="category"
          >
            <span class="category-label">{{ category }}</span>
            <div class="category-track">
              <div
                class="category-fill"
                :class="category"
                :style="{ width: `${data.stats.categoryAverages[category]}%` }"
              ></div>
            </div>
            <strong>{{ data.stats.categoryAverages[category] }}</strong>
          </div>
          <div class="finding-counts">
            <span class="finding-pill error-pill"><b>{{ data.stats.errorFindings }}</b> errors</span>
            <span class="finding-pill security-pill"><b>{{ data.stats.securityFindings }}</b> security</span>
            <span class="finding-pill performance-pill"><b>{{ data.stats.performanceFindings }}</b> performance</span>
          </div>
        </article>
      </section>

      <!-- Panel Grid: Recent Analyses & Recent AI Artifacts -->
      <section class="panel-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>Recent analyses</h2>
            <button class="link-button" @click="emit('navigate', 'history')">View all →</button>
          </header>
          <p v-if="data.recentReports.length === 0" class="muted">No reports yet.</p>
          <div class="recent-list">
            <button
              v-for="report in data.recentReports"
              :key="report.id"
              class="recent-item"
              @click="emit('navigate', 'history')"
            >
              <div class="recent-item-icon">📄</div>
              <span class="recent-main">
                <strong>{{ report.filename || "Untitled" }}</strong>
                <small>{{ report.project?.name || report.language }} · {{ formatDate(report.createdAt) }}</small>
              </span>
              <span class="score-badge" :class="scoreClass(report.overallScore)">{{ report.overallScore }}</span>
            </button>
          </div>
        </article>

        <article class="panel">
          <header class="panel-header">
            <h2>Recent AI artifacts</h2>
            <button class="link-button" @click="emit('navigate', 'analyze')">Analyze code →</button>
          </header>
          <p v-if="data.recentArtifacts.length === 0" class="muted">No AI artifacts yet.</p>
          <div class="recent-list">
            <div v-for="artifact in data.recentArtifacts" :key="artifact.id" class="artifact-row">
              <div class="artifact-info">
                <strong>{{ artifact.title }}</strong>
                <small>{{ artifact.provider }} · {{ artifact.model }} · {{ formatDate(artifact.createdAt) }}</small>
              </div>
              <span class="tag">{{ artifact.kind }}</span>
            </div>
          </div>
        </article>
      </section>

      <!-- Kestra-inspired Horizon Cosmic Arc CTA Section -->
      <section class="cosmic-horizon">
        <div class="horizon-badge">
          <span class="horizon-dot"></span>
          AI-Powered Code Intelligence Ready
        </div>
        <h3 class="horizon-heading">Build and analyze repositories with zero friction.</h3>
        <p class="horizon-desc">
          DevMate pairs deterministic AST linting with modern LLMs for automated explanations, PR comments, and instant refactoring.
        </p>
        <div class="cta">
          <button class="primary" @click="emit('navigate', 'analyze')">
            <span>⚡ Run a new analysis</span>
          </button>
          <button class="secondary" @click="emit('navigate', 'repositories')">
            <span>🗂 Manage repositories</span>
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.loading {
  color: #a5b4fc;
  padding: 5rem 1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  font-size: 0.95rem;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(139, 92, 246, 0.2);
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Pipeline Flow Banner */
.pipeline-card {
  background: rgba(16, 11, 29, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.22);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.pipeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.pipeline-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: #a5b4fc;
}

.sparkle {
  color: #c084fc;
  font-size: 1rem;
  filter: drop-shadow(0 0 6px rgba(192, 132, 252, 0.8));
}

.pipeline-path {
  color: #94a3b8;
}

.pipeline-path strong {
  color: #f8fafc;
}

.pipeline-badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge-pill {
  font-size: 0.72rem;
  padding: 0.25rem 0.65rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
}

.active-pill {
  background: rgba(124, 58, 237, 0.2);
  border-color: rgba(168, 85, 247, 0.4);
  color: #e0e7ff;
}

.pipeline-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.flow-step {
  flex: 1;
  min-width: 170px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(10, 7, 20, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.16);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  transition: all 0.2s ease;
}

.flow-step:hover {
  border-color: rgba(168, 85, 247, 0.4);
  transform: translateY(-1px);
}

.active-step {
  background: rgba(20, 13, 38, 0.9);
  border-color: #8b5cf6;
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.3), inset 0 0 12px rgba(124, 58, 237, 0.15);
}

.step-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.active-icon {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  border-color: #a855f7;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.step-tag {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #818cf8;
}

.active-tag {
  color: #c084fc;
  font-weight: 600;
}

.step-content strong {
  font-size: 0.84rem;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-content small {
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flow-connector {
  color: #6d28d9;
  font-size: 0.9rem;
  letter-spacing: 0.15em;
  opacity: 0.6;
  flex-shrink: 0;
}

/* Stat Grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  background: rgba(16, 11, 29, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 14px;
  padding: 1.25rem;
  display: grid;
  gap: 0.35rem;
  backdrop-filter: blur(14px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: rgba(168, 85, 247, 0.45);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.15);
}

.stat-label {
  color: #a5b4fc;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
}

.stat-card strong {
  color: #ffffff;
  font-size: 2.2rem;
  line-height: 1.1;
  font-weight: 700;
}

.stat-card small {
  color: #64748b;
  font-size: 0.75rem;
}

.good {
  color: #34d399 !important;
  text-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
}

.warning {
  color: #fbbf24 !important;
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.35);
}

.poor {
  color: #fb7185 !important;
  text-shadow: 0 0 12px rgba(251, 113, 133, 0.35);
}

/* Panel Grid */
.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.25rem;
}

.panel {
  background: rgba(16, 11, 29, 0.7);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 14px;
  padding: 1.35rem;
  display: grid;
  gap: 1rem;
  align-content: start;
  backdrop-filter: blur(14px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease;
}

.panel:hover {
  border-color: rgba(168, 85, 247, 0.35);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(139, 92, 246, 0.12);
  padding-bottom: 0.75rem;
}

.panel-header h2 {
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}

.muted {
  color: #94a3b8;
  font-size: 0.8rem;
  margin: 0;
}

.link-button {
  background: transparent;
  border: 0;
  color: #c084fc;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  transition: color 0.15s, transform 0.15s;
}

.link-button:hover {
  color: #e9d5ff;
  transform: translateX(2px);
}

/* Trend Chart */
.trend {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  height: 130px;
  padding-top: 0.5rem;
}

.trend-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  height: 100%;
}

.trend-bar {
  flex: 1;
  width: 100%;
  background: rgba(10, 7, 20, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.14);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.trend-fill {
  width: 100%;
  background: linear-gradient(180deg, #c084fc 0%, #7c3aed 55%, #4338ca 100%);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.35);
  transition: height 0.4s ease;
}

.trend-label {
  color: #818cf8;
  font-size: 0.65rem;
  font-weight: 500;
}

/* Category Averages */
.category-row {
  display: grid;
  grid-template-columns: 100px 1fr 38px;
  align-items: center;
  gap: 0.75rem;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.category-label {
  text-transform: capitalize;
  color: #a5b4fc;
  font-weight: 500;
}

.category-track {
  background: rgba(10, 7, 20, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.14);
  border-radius: 999px;
  height: 9px;
  overflow: hidden;
}

.category-fill {
  height: 100%;
  border-radius: 999px;
}

.category-fill.correctness {
  background: linear-gradient(90deg, #6366f1, #818cf8);
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
}

.category-fill.security {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.category-fill.performance {
  background: linear-gradient(90deg, #9333ea, #c084fc);
  box-shadow: 0 0 8px rgba(192, 132, 252, 0.4);
}

.category-row strong {
  color: #ffffff;
  text-align: right;
  font-weight: 600;
}

.finding-counts {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  border-top: 1px solid rgba(139, 92, 246, 0.12);
  padding-top: 0.9rem;
}

.finding-pill {
  font-size: 0.78rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.error-pill b { color: #fb7185; }
.security-pill b { color: #fbbf24; }
.performance-pill b { color: #c084fc; }

/* Recent Items List */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  background: rgba(10, 7, 20, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 10px;
  cursor: pointer;
  padding: 0.75rem 0.9rem;
  text-align: left;
  transition: all 0.18s ease;
}

.recent-item:hover {
  border-color: #8b5cf6;
  background: rgba(20, 14, 38, 0.85);
  transform: translateX(2px);
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.2);
}

.recent-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(124, 58, 237, 0.15);
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.recent-main {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.recent-main strong {
  color: #ffffff;
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-main small {
  color: #94a3b8;
  font-size: 0.72rem;
}

.score-badge {
  background: rgba(124, 58, 237, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  padding: 0.3rem 0.65rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffffff;
}

.artifact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: rgba(10, 7, 20, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
}

.artifact-info strong {
  display: block;
  color: #ffffff;
  font-size: 0.85rem;
}

.artifact-info small {
  color: #94a3b8;
  font-size: 0.72rem;
}

.tag {
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 999px;
  color: #d8b4fe;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  white-space: nowrap;
}

/* Cosmic Horizon Arc CTA Section */
.cosmic-horizon {
  position: relative;
  margin-top: 1rem;
  padding: 3rem 2rem 2.5rem;
  border-radius: 20px;
  background: 
    radial-gradient(ellipse 90% 60% at 50% 120%, rgba(124, 58, 237, 0.42) 0%, rgba(79, 70, 229, 0.16) 45%, transparent 80%),
    rgba(14, 10, 26, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 
    0 0 40px rgba(124, 58, 237, 0.15),
    inset 0 1px 0 rgba(168, 85, 247, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.1rem;
  overflow: hidden;
  backdrop-filter: blur(16px);
}

.horizon-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  color: #e0e7ff;
  font-size: 0.78rem;
  font-weight: 500;
}

.horizon-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.horizon-heading {
  font-size: 1.5rem;
  color: #ffffff;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.01em;
}

.horizon-desc {
  color: #a5b4fc;
  font-size: 0.9rem;
  max-width: 650px;
  margin: 0;
  line-height: 1.5;
}

.cta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}

.primary {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 10px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.92rem;
  padding: 0.8rem 1.4rem;
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.45);
  transition: all 0.2s ease;
}

.primary:hover {
  box-shadow: 0 0 28px rgba(168, 85, 247, 0.75);
  transform: translateY(-2px);
}

.secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  color: #f1f5f9;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 500;
  padding: 0.8rem 1.4rem;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.secondary:hover {
  background: rgba(124, 58, 237, 0.18);
  border-color: rgba(168, 85, 247, 0.5);
  color: #ffffff;
  transform: translateY(-2px);
}

/* ==========================================================================
   Retro Neo-Brutalist Hero Styles (Inspired by Jellykit screenshot)
   ========================================================================== */
.brutalist-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, 1fr);
  gap: 2.5rem;
  align-items: stretch;
  margin-bottom: 2rem;
}

@media (max-width: 960px) {
  .brutalist-hero {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }
}

.hero-left {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a1a1aa;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.hero-headline {
  font-family: var(--font-display, 'Syne', sans-serif);
  font-size: clamp(2.4rem, 4.4vw, 4.1rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #ffffff;
  text-transform: uppercase;
  margin: 0;
}

.headline-highlight-box {
  background: #ffd738;
  color: #000000;
  border: 2.5px solid #000000;
  padding: 0 0.3em;
  box-shadow: 4px 4px 0px #000000;
  display: inline-block;
  transform: rotate(-0.5deg);
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 1.55;
  color: #cbd5e1;
  margin: 0;
  max-width: 580px;
}

.hero-desc strong {
  color: #ffffff;
  font-weight: 700;
}

.hero-metrics-bar {
  display: flex;
  align-items: stretch;
  border-top: 1.5px solid rgba(255, 255, 255, 0.12);
  padding-top: 1.25rem;
  gap: 1.75rem;
}

.metric-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.m-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.m-value {
  font-family: var(--font-heading, sans-serif);
  font-size: 2.2rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.metric-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.12);
}

.hero-right {
  display: flex;
}

.hidden-file-input {
  display: none;
}

.yellow-drop-card {
  width: 100%;
  background: #ffd738;
  border: 2.5px solid #000000;
  border-radius: 14px;
  box-shadow: 6px 6px 0px #000000;
  padding: 2.2rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
  color: #000000;
}

.yellow-drop-card:hover {
  transform: translateY(-2px);
  box-shadow: 8px 8px 0px #000000;
}

.yellow-drop-card.is-dragging {
  border-style: dashed;
  outline: 3px dashed #000000;
  outline-offset: -6px;
  background: #ffe373;
  transform: scale(1.02);
}

.drop-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.square-plus-btn {
  width: 38px;
  height: 38px;
  border: 2px solid #000000;
  background: #ffffff;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1;
  box-shadow: 2px 2px 0px #000000;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.square-plus-btn:hover {
  background: #f4f4f5;
  transform: scale(1.08);
}

.universal-drop-tag {
  border: 1.5px solid #000000;
  border-radius: 5px;
  padding: 0.2rem 0.6rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.65);
}

.drop-center {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.drop-title {
  font-family: var(--font-display, 'Syne', sans-serif);
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
  margin: 0;
  color: #000000;
  text-transform: uppercase;
}

.drop-subtitle {
  font-size: 0.98rem;
  font-weight: 600;
  color: #18181b;
  margin: 0;
}

.format-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.f-pill {
  background: #ffffff;
  border: 1.5px solid #000000;
  border-radius: 4px;
  padding: 0.15rem 0.55rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  color: #000000;
  box-shadow: 1px 1px 0px #000000;
}

.drop-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.btn-drop-dark {
  background: #000000;
  color: #ffffff;
  border: 2px solid #000000;
  border-radius: 8px;
  font-weight: 800;
  padding: 0.8rem 1.4rem;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.4);
}

.btn-drop-dark:hover {
  background: #18181b;
  transform: translateY(-1px);
}

.btn-drop-white {
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 8px;
  font-weight: 800;
  padding: 0.8rem 1.25rem;
  font-size: 0.92rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s;
  box-shadow: 2px 2px 0px #000000;
}

.btn-drop-white:hover {
  background: #f4f4f5;
  transform: translateY(-1px);
}

.mini-keycap {
  background: #e4e4e7;
  border: 1px solid #000000;
  border-radius: 3px;
  padding: 0.05rem 0.3rem;
  font-size: 0.65rem;
  font-family: var(--font-mono, monospace);
  font-weight: 800;
}

.drop-footer {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #18181b;
}

.footer-green-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  border: 1px solid #000000;
}

/* ==========================================================================
   Light Mode Overrides for Dashboard (Retro Warm Cream & Neo-Brutalist)
   ========================================================================== */
:global(body.light-theme) .hero-headline {
  color: #000000;
}

:global(body.light-theme) .hero-eyebrow {
  color: #52525b;
}

:global(body.light-theme) .hero-desc {
  color: #27272a;
}

:global(body.light-theme) .hero-desc strong {
  color: #000000;
}

:global(body.light-theme) .hero-metrics-bar {
  border-top: 2px solid #000000;
}

:global(body.light-theme) .metric-divider {
  background: #000000;
}

:global(body.light-theme) .m-label {
  color: #52525b;
}

:global(body.light-theme) .m-value {
  color: #000000;
}

:global(body.light-theme) .stat-card {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .stat-card .stat-label {
  color: #52525b;
  font-weight: 700;
  text-transform: uppercase;
}

:global(body.light-theme) .stat-card strong {
  color: #000000;
}

:global(body.light-theme) .stat-card small {
  color: #71717a;
}

:global(body.light-theme) .panel {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
}

:global(body.light-theme) .panel-header h2 {
  color: #000000;
  font-family: var(--font-heading, sans-serif);
  font-weight: 800;
}

:global(body.light-theme) .pipeline-card {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
}

:global(body.light-theme) .pipeline-path {
  color: #000000;
}

:global(body.light-theme) .sparkle {
  color: #000000;
}

:global(body.light-theme) .flow-step {
  background: #fdfcfa;
  border: 1.5px solid #000000;
  box-shadow: 2px 2px 0px #000000;
  color: #000000;
}

:global(body.light-theme) .flow-step strong {
  color: #000000;
}

:global(body.light-theme) .flow-step small {
  color: #52525b;
}

:global(body.light-theme) .flow-step.active-step {
  background: #ffd738;
  border: 2px solid #000000;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .step-tag.active-tag {
  background: #000000;
  color: #ffffff;
}

:global(body.light-theme) .badge-pill {
  background: #f4f0ea;
  border: 1.5px solid #000000;
  color: #000000;
  font-weight: 700;
}

:global(body.light-theme) .badge-pill.active-pill {
  background: #ffd738;
  border: 1.5px solid #000000;
  color: #000000;
}

:global(body.light-theme) .recent-item {
  background: #ffffff;
  border: 1.5px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .recent-item strong {
  color: #000000;
}

:global(body.light-theme) .recent-item small {
  color: #52525b;
}

:global(body.light-theme) .artifact-row {
  background: #ffffff;
  border: 1.5px solid #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .artifact-row strong {
  color: #000000;
}

:global(body.light-theme) .artifact-row small {
  color: #52525b;
}

:global(body.light-theme) .cosmic-horizon {
  background: #ffffff;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
}

:global(body.light-theme) .horizon-heading {
  color: #000000;
  font-family: var(--font-heading, sans-serif);
  font-weight: 800;
}

:global(body.light-theme) .horizon-desc {
  color: #52525b;
}

:global(body.light-theme) .cosmic-horizon .primary {
  background: #ffd738;
  color: #000000;
  border: 2px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  font-weight: 800;
}

:global(body.light-theme) .cosmic-horizon .secondary {
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  box-shadow: 2px 2px 0px #000000;
  font-weight: 700;
}
</style>
