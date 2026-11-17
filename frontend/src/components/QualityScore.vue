<script setup lang="ts">
import type { AnalysisResult } from "@/types/analysis";

defineProps<{ quality: AnalysisResult["quality"] }>();

function getScoreStatus(category: "correctness" | "security" | "performance", score: number): { label: string; class: string; icon: string } {
  if (category === "security") {
    if (score >= 100) return { label: "Clean (0 detected)", class: "status-pass", icon: "🛡️" };
    if (score >= 80) return { label: "Moderate Risk", class: "status-warn", icon: "⚠️" };
    return { label: "Vulnerable", class: "status-fail", icon: "🚨" };
  }
  if (category === "correctness") {
    if (score >= 100) return { label: "Passing", class: "status-pass", icon: "✓" };
    if (score >= 80) return { label: "Minor Warnings", class: "status-warn", icon: "!" };
    return { label: "Errors Found", class: "status-fail", icon: "✕" };
  }
  if (score >= 100) return { label: "Optimal", class: "status-pass", icon: "⚡" };
  if (score >= 80) return { label: "Suboptimal", class: "status-warn", icon: "⏱️" };
  return { label: "Inefficient", class: "status-fail", icon: "🐢" };
}

function getBarGradient(score: number): string {
  if (score >= 90) return "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)";
  if (score >= 70) return "linear-gradient(90deg, #f59e0b 0%, #eab308 100%)";
  return "linear-gradient(90deg, #ef4444 0%, #f97316 100%)";
}
</script>

<template>
  <section class="card quality" aria-label="Quality score">
    <div class="quality-header">
      <div class="overall-row">
        <div class="overall-meta">
          <span class="label">Overall Score</span>
          <span class="badge-deterministic" title="Deterministically calculated from static AST & pattern rules">Static Scan</span>
        </div>
        <div class="overall-score">
          <strong>{{ quality.overall }}</strong>
          <small>/100</small>
        </div>
      </div>
      <div class="progress-track" aria-hidden="true">
        <div
          class="progress-fill"
          :style="{ width: `${quality.overall}%`, background: getBarGradient(quality.overall) }"
        ></div>
      </div>
    </div>

    <div class="categories-list">
      <!-- Correctness -->
      <div class="score-row">
        <div class="row-left">
          <span class="category-name">Correctness</span>
          <span
            class="status-pill"
            :class="getScoreStatus('correctness', quality.categories.correctness).class"
          >
            {{ getScoreStatus('correctness', quality.categories.correctness).label }}
          </span>
        </div>
        <div class="row-right">
          <b>{{ quality.categories.correctness }}</b>
          <small>/100</small>
        </div>
      </div>

      <!-- Security -->
      <div class="score-row">
        <div class="row-left">
          <span class="category-name">Security</span>
          <span
            class="status-pill"
            :class="getScoreStatus('security', quality.categories.security).class"
          >
            {{ getScoreStatus('security', quality.categories.security).label }}
          </span>
        </div>
        <div class="row-right">
          <b>{{ quality.categories.security }}</b>
          <small>/100</small>
        </div>
      </div>

      <!-- Performance -->
      <div class="score-row">
        <div class="row-left">
          <span class="category-name">Performance</span>
          <span
            class="status-pill"
            :class="getScoreStatus('performance', quality.categories.performance).class"
          >
            {{ getScoreStatus('performance', quality.categories.performance).label }}
          </span>
        </div>
        <div class="row-right">
          <b>{{ quality.categories.performance }}</b>
          <small>/100</small>
        </div>
      </div>
    </div>

    <!-- Security & Score Scope Disclaimer (Approach A) -->
    <div class="security-disclaimer">
      <div class="disclaimer-header">
        <span class="disclaimer-icon">ℹ️</span>
        <span class="disclaimer-title">Audit Scope & Confidence</span>
      </div>
      <p class="disclaimer-text">
        Scores reflect automated checks against static pattern rules (secrets, injection, command execution, logic).
        A <strong>100/100</strong> indicates <em>zero detected pattern violations</em> in this scan, rather than a guarantee of absolute runtime security.
      </p>
    </div>
  </section>
</template>

<style scoped>
.quality {
  display: grid;
  gap: 1.1rem;
  background: rgba(18, 14, 33, 0.75);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35);
}

.quality-header {
  display: grid;
  gap: 0.6rem;
}

.overall-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overall-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.overall-meta .label {
  font-size: 0.82rem;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-deterministic {
  align-self: flex-start;
  font-size: 0.65rem;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.3);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.overall-score {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.overall-score strong {
  color: #38bdf8;
  font-size: 2.3rem;
  font-weight: 800;
  line-height: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.overall-score small {
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 600;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease-out;
}

.categories-list {
  display: grid;
  gap: 0.65rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.score-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.15s ease;
}

.score-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.row-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.category-name {
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  letter-spacing: 0.02em;
}

.status-pass {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.status-warn {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.status-fail {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.row-right {
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.row-right b {
  color: #f8fafc;
  font-size: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.row-right small {
  color: #64748b;
  font-size: 0.75rem;
}

.security-disclaimer {
  display: grid;
  gap: 0.3rem;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.disclaimer-header {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.disclaimer-icon {
  font-size: 0.8rem;
}

.disclaimer-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.disclaimer-text {
  font-size: 0.72rem;
  line-height: 1.4;
  color: #64748b;
  margin: 0;
}

.disclaimer-text strong {
  color: #94a3b8;
}

.disclaimer-text em {
  color: #cbd5e1;
  font-style: normal;
}
</style>
