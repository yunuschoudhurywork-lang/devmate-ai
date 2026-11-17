<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ApiError, getDashboard } from "@/services/api";
import type { DashboardData } from "@/types/analysis";
import type { ViewId } from "@/types/navigation";

const emit = defineEmits<{ navigate: [view: ViewId] }>();

const data = ref<DashboardData | null>(null);
const loading = ref(true);
const error = ref("");

const maxTrend = computed(() => {
  const scores = data.value?.scoreTrend.map((point) => point.averageScore ?? 0) ?? [0];
  return Math.max(1, ...scores);
});

onMounted(async () => {
  try {
    data.value = await getDashboard();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load dashboard data.";
  } finally {
    loading.value = false;
  }
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
</style>
