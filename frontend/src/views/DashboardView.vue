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
    <div v-if="loading" class="loading">Loading dashboard…</div>

    <template v-else-if="data">
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

      <section class="panel-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>Quality trend</h2>
            <span class="muted">last {{ data.scoreTrend.length }} days</span>
          </header>
          <div class="trend">
            <div v-for="point in data.scoreTrend" :key="point.date" class="trend-column" :title="`${point.date}: ${point.reports} analyses`">
              <div class="trend-bar">
                <div
                  class="trend-fill"
                  :style="{ height: `${point.averageScore === null ? 0 : Math.round((point.averageScore / maxTrend) * 100)}%` }"
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
          <div class="category-row" v-for="category in (['correctness', 'security', 'performance'] as const)" :key="category">
            <span class="category-label">{{ category }}</span>
            <div class="category-track">
              <div class="category-fill" :class="category" :style="{ width: `${data.stats.categoryAverages[category]}%` }"></div>
            </div>
            <strong>{{ data.stats.categoryAverages[category] }}</strong>
          </div>
          <div class="finding-counts">
            <span><b>{{ data.stats.errorFindings }}</b> errors</span>
            <span><b>{{ data.stats.securityFindings }}</b> security</span>
            <span><b>{{ data.stats.performanceFindings }}</b> performance</span>
          </div>
        </article>
      </section>

      <section class="panel-grid">
        <article class="panel">
          <header class="panel-header">
            <h2>Recent analyses</h2>
            <button class="link-button" @click="emit('navigate', 'history')">View all</button>
          </header>
          <p v-if="data.recentReports.length === 0" class="muted">No reports yet.</p>
          <button
            v-for="report in data.recentReports"
            :key="report.id"
            class="recent-item"
            @click="emit('navigate', 'history')"
          >
            <span class="recent-main">
              <strong>{{ report.filename || "Untitled" }}</strong>
              <small>{{ report.project?.name || report.language }} · {{ formatDate(report.createdAt) }}</small>
            </span>
            <span class="score-badge" :class="scoreClass(report.overallScore)">{{ report.overallScore }}</span>
          </button>
        </article>

        <article class="panel">
          <header class="panel-header">
            <h2>Recent AI artifacts</h2>
            <button class="link-button" @click="emit('navigate', 'ai')">Open AI review</button>
          </header>
          <p v-if="data.recentArtifacts.length === 0" class="muted">No AI artifacts yet.</p>
          <div v-for="artifact in data.recentArtifacts" :key="artifact.id" class="artifact-row">
            <div>
              <strong>{{ artifact.title }}</strong>
              <small>{{ artifact.provider }} · {{ artifact.model }} · {{ formatDate(artifact.createdAt) }}</small>
            </div>
            <span class="tag">{{ artifact.kind }}</span>
          </div>
        </article>
      </section>

      <section class="cta">
        <button class="primary" @click="emit('navigate', 'analyze')">Run a new analysis</button>
        <button class="secondary" @click="emit('navigate', 'repositories')">Manage repositories</button>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard { display: grid; gap: 1.25rem; }
.error { color: #fca5a5; }
.loading { color: #94a3b8; padding: 3rem; text-align: center; }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { background: rgba(23, 32, 51, 0.85); border: 1px solid #293750; border-radius: 12px; padding: 1.1rem; display: grid; gap: 0.3rem; }
.stat-label { color: #94a3b8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; }
.stat-card strong { color: #f8fafc; font-size: 2rem; line-height: 1.1; }
.stat-card small { color: #64748b; font-size: 0.75rem; }
.good { color: #86efac !important; }
.warning { color: #fde68a !important; }
.poor { color: #fca5a5 !important; }

.panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
.panel { background: rgba(23, 32, 51, 0.85); border: 1px solid #293750; border-radius: 12px; padding: 1.15rem; display: grid; gap: 0.85rem; align-content: start; }
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.panel-header h2 { color: #e2e8f0; font-size: 1rem; margin: 0; }
.muted { color: #94a3b8; font-size: 0.8rem; margin: 0; }
.link-button { background: transparent; border: 0; color: #38bdf8; cursor: pointer; font-size: 0.8rem; }

.trend { display: flex; align-items: flex-end; gap: 0.35rem; height: 120px; }
.trend-column { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; height: 100%; }
.trend-bar { flex: 1; width: 100%; background: #0f1729; border-radius: 4px; display: flex; align-items: flex-end; overflow: hidden; }
.trend-fill { width: 100%; background: linear-gradient(180deg, #38bdf8, #0284c7); border-radius: 4px 4px 0 0; transition: height 0.3s; }
.trend-label { color: #64748b; font-size: 0.6rem; }

.category-row { display: grid; grid-template-columns: 90px 1fr 36px; align-items: center; gap: 0.6rem; color: #cbd5e1; font-size: 0.82rem; }
.category-label { text-transform: capitalize; color: #94a3b8; }
.category-track { background: #0f1729; border-radius: 999px; height: 8px; overflow: hidden; }
.category-fill { height: 100%; border-radius: 999px; }
.category-fill.correctness { background: #38bdf8; }
.category-fill.security { background: #fbbf24; }
.category-fill.performance { background: #a78bfa; }
.category-row strong { color: #f8fafc; text-align: right; }
.finding-counts { display: flex; gap: 1.2rem; color: #94a3b8; font-size: 0.8rem; border-top: 1px solid #293750; padding-top: 0.8rem; }
.finding-counts b { color: #e2e8f0; }

.recent-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #0f1729; border: 1px solid #22304a; border-radius: 8px; cursor: pointer; padding: 0.7rem 0.8rem; text-align: left; }
.recent-item:hover { border-color: #38bdf8; }
.recent-main { display: grid; gap: 0.2rem; min-width: 0; }
.recent-main strong { color: #e2e8f0; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-main small { color: #64748b; font-size: 0.72rem; }
.score-badge { background: #0f1729; border: 1px solid #22304a; border-radius: 6px; padding: 0.25rem 0.55rem; font-weight: 700; font-size: 0.85rem; color: #e2e8f0; }

.artifact-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.artifact-row strong { display: block; color: #e2e8f0; font-size: 0.82rem; }
.artifact-row small { color: #64748b; font-size: 0.72rem; }
.tag { background: #1e3a5f; border-radius: 999px; color: #7dd3fc; font-size: 0.68rem; padding: 0.15rem 0.5rem; white-space: nowrap; }

.cta { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.primary { background: #fbbf24; border: 0; border-radius: 8px; color: #0b0c0e; cursor: pointer; font-weight: 700; padding: 0.7rem 1.1rem; }
.secondary { background: transparent; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; cursor: pointer; padding: 0.7rem 1.1rem; }
</style>
