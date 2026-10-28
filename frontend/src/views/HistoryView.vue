<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ApiError, getReportsList, getReport, deleteReport } from "@/services/api";
import type { ReportListItem, SavedReport } from "@/types/analysis";
import AnalysisSummary from "@/components/AnalysisSummary.vue";
import FindingsList from "@/components/FindingsList.vue";
import QualityScore from "@/components/QualityScore.vue";
import ReviewSummary from "@/components/ReviewSummary.vue";

const reports = ref<ReportListItem[]>([]);
const selectedReport = ref<SavedReport | null>(null);
const loading = ref(false);
const reportLoading = ref(false);
const error = ref("");
const page = ref(1);
const pageSize = 20;
const totalPages = ref(1);

onMounted(() => {
  loadReports();
});

async function loadReports(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await getReportsList(page.value, pageSize);
    reports.value = result.reports;
    totalPages.value = result.pagination.totalPages;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load reports.";
  } finally {
    loading.value = false;
  }
}

async function openReport(reportId: string): Promise<void> {
  reportLoading.value = true;
  error.value = "";
  try {
    const result = await getReport(reportId);
    selectedReport.value = result.report;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load report.";
  } finally {
    reportLoading.value = false;
  }
}

function closeReport(): void {
  selectedReport.value = null;
}

async function confirmDelete(reportId: string, event: Event): Promise<void> {
  event.stopPropagation();
  if (!confirm("Delete this report? This action cannot be undone.")) return;

  try {
    await deleteReport(reportId);
    await loadReports();
    if (selectedReport.value?.id === reportId) {
      selectedReport.value = null;
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to delete report.";
  }
}

async function nextPage(): Promise<void> {
  if (page.value < totalPages.value) {
    page.value++;
    await loadReports();
  }
}

async function prevPage(): Promise<void> {
  if (page.value > 1) {
    page.value--;
    await loadReports();
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
</script>

<template>
  <main class="history">
    <header class="history-header">
      <h1>📊 Analysis History</h1>
      <button @click="$router?.push?.('/') || (window.location.href = '/')" class="back-button">← Back to Analyze</button>
    </header>

    <div v-if="selectedReport" class="report-view">
      <div class="report-header">
        <div>
          <h2>{{ selectedReport.filename || 'Untitled' }}</h2>
          <p class="report-meta">{{ selectedReport.language }} • {{ formatDate(selectedReport.createdAt) }}</p>
        </div>
        <button @click="closeReport" class="close-button">✕ Close</button>
      </div>

      <div class="report-content">
        <QualityScore :quality="selectedReport.analysis.quality" />
        <AnalysisSummary :summary="selectedReport.analysis.summary" />
        <ReviewSummary v-if="selectedReport.reviewSummary" :summary="selectedReport.reviewSummary" />
        <FindingsList
          :findings="selectedReport.analysis.findings"
          :analyzed="true"
          :report-id="selectedReport.id"
        />
      </div>
    </div>

    <div v-else class="reports-list">
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div v-if="loading" class="loading">Loading reports...</div>

      <div v-else-if="reports.length === 0" class="empty">
        <p>No analysis reports yet.</p>
        <p class="hint">Run your first code analysis to see it here.</p>
      </div>

      <div v-else>
        <div v-for="report in reports" :key="report.id" class="report-card" @click="openReport(report.id)">
          <div class="report-card-main">
            <div class="report-card-info">
              <h3>{{ report.filename || 'Untitled' }}</h3>
              <p class="report-card-meta">{{ report.language }} • {{ formatDate(report.createdAt) }}</p>
            </div>
            <div class="report-card-stats">
              <div class="stat">
                <span class="stat-label">Quality</span>
                <span class="stat-value" :class="{ good: report.overallScore >= 80, warning: report.overallScore >= 60 && report.overallScore < 80, poor: report.overallScore < 60 }">{{ report.overallScore }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Findings</span>
                <span class="stat-value">{{ report.totalFindings }}</span>
              </div>
            </div>
          </div>
          <div class="report-card-actions">
            <span v-if="report.hasReviewSummary" class="badge">AI Summary</span>
            <button @click="confirmDelete(report.id, $event)" class="delete-button" title="Delete report">🗑</button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button @click="prevPage" :disabled="page === 1">← Previous</button>
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page === totalPages">Next →</button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.history { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { color: #e2e8f0; font-size: 2rem; margin: 0; }
.back-button, .close-button { background: #1e3a5f; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; cursor: pointer; padding: .6rem 1rem; }
.back-button:hover, .close-button:hover { background: #2d5a8f; }

.reports-list { display: grid; gap: 1rem; }
.report-card { background: #172033; border: 1px solid #293750; border-radius: 8px; cursor: pointer; padding: 1.2rem; transition: border-color .2s; }
.report-card:hover { border-color: #0ea5e9; }
.report-card-main { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: .8rem; }
.report-card-info h3 { color: #e2e8f0; font-size: 1.1rem; margin: 0 0 .4rem; }
.report-card-meta { color: #94a3b8; font-size: .85rem; margin: 0; }
.report-card-stats { display: flex; gap: 1.5rem; }
.stat { display: grid; gap: .25rem; text-align: center; }
.stat-label { color: #94a3b8; font-size: .75rem; }
.stat-value { color: #e2e8f0; font-size: 1.3rem; font-weight: 700; }
.stat-value.good { color: #86efac; }
.stat-value.warning { color: #fde68a; }
.stat-value.poor { color: #fca5a5; }
.report-card-actions { display: flex; align-items: center; gap: .8rem; justify-content: flex-end; }
.badge { background: #1e3a5f; border-radius: 999px; color: #7dd3fc; font-size: .75rem; padding: .3rem .6rem; }
.delete-button { background: transparent; border: 0; color: #94a3b8; cursor: pointer; font-size: 1.2rem; padding: .3rem; }
.delete-button:hover { color: #fca5a5; }

.report-view { display: grid; gap: 1.5rem; }
.report-header { align-items: center; display: flex; justify-content: space-between; }
.report-header h2 { color: #e2e8f0; margin: 0; }
.report-meta { color: #94a3b8; font-size: .9rem; margin: .3rem 0 0; }
.report-content { display: grid; gap: 1rem; }

.loading, .empty { color: #94a3b8; padding: 3rem; text-align: center; }
.empty .hint { color: #64748b; font-size: .9rem; }
.error { color: #fca5a5; }

.pagination { display: flex; align-items: center; gap: 1rem; justify-content: center; margin-top: 1.5rem; }
.pagination button { background: #0284c7; border: 0; border-radius: 6px; color: white; cursor: pointer; padding: .6rem 1rem; }
.pagination button:disabled { cursor: not-allowed; opacity: .5; }
.pagination span { color: #cbd5e1; }
</style>
