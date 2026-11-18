<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import AuthPanel from "@/components/AuthPanel.vue";
import DashboardView from "@/views/DashboardView.vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import HistoryView from "@/views/HistoryView.vue";
import RepositoriesView from "@/views/RepositoriesView.vue";
import SettingsView from "@/views/SettingsView.vue";
import ContactView from "@/views/ContactView.vue";
import { useAuth } from "@/composables/useAuth";
import { useTheme } from "@/composables/useTheme";
import type { AnalysisLanguage } from "@/types/analysis";
import { VIEW_TITLES, type ViewId } from "@/types/navigation";

const currentView = ref<ViewId>("dashboard");
const selectedProjectId = ref<string | undefined>(undefined);
const pendingAnalysisData = ref<{
  code: string;
  filename?: string;
  language?: AnalysisLanguage;
} | null>(null);

const { user, isLoading, restoreSession, checkAuthError, clearAuthError } = useAuth();
const { isDark, toggleTheme } = useTheme();
const authErrorMessage = ref<string | null>(null);

const heading = computed(() => VIEW_TITLES[currentView.value]);

function navigate(view: ViewId): void {
  currentView.value = view;
}

function handleAnalyzeCode(payload: {
  code: string;
  filename?: string;
  language?: AnalysisLanguage;
}): void {
  pendingAnalysisData.value = { ...payload };
  currentView.value = "analyze";
}

function analyzeProject(projectId: string): void {
  selectedProjectId.value = projectId;
  currentView.value = "analyze";
}

onMounted(async () => {
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      navigate("analyze");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
      if (currentView.value !== "dashboard") {
        e.preventDefault();
        navigate("analyze");
      }
    }
  });

  const urlError = checkAuthError();
  if (urlError) {
    authErrorMessage.value = urlError;
    setTimeout(() => {
      authErrorMessage.value = null;
    }, 6000);
  }

  const params = new URLSearchParams(window.location.search);
  const authSucceeded = params.get("auth") === "success";

  await restoreSession();

  if (urlError || authSucceeded) {
    clearAuthError();
  }
});
</script>

<template>
  <div v-if="isLoading && !user" class="splash">
    <span class="splash-mark">◆</span>
    <p>Loading DevMate AI…</p>
  </div>

  <div v-else-if="!user" class="auth-shell">
    <div v-if="authErrorMessage" class="auth-error-banner">
      <span>{{ authErrorMessage }}</span>
      <button class="close-btn" @click="authErrorMessage = null">×</button>
    </div>
    <AuthPanel />
  </div>

  <div v-else class="app-container">
    <div v-if="authErrorMessage" class="auth-error-banner">
      <span>{{ authErrorMessage }}</span>
      <button class="close-btn" @click="authErrorMessage = null">×</button>
    </div>

    <Sidebar :active="currentView" @navigate="navigate" />

    <main class="main-content">
      <header class="app-header">
        <div class="header-left">
          <div class="header-titles">
            <h1>{{ heading.title }}</h1>
            <p class="subtitle">{{ heading.subtitle }}</p>
          </div>
        </div>

        <div class="header-right">
          <div class="status-pill-local" title="Local AST and deterministic analysis engine active">
            <span class="dot-green"></span>
            <span>LOCAL</span>
          </div>

          <!-- Top-Right Theme Toggle Button (Light/Dark Mode) -->
          <button
            class="top-right-btn theme-toggle-btn"
            @click="toggleTheme"
            :title="isDark ? 'Switch to Non-Dark (Light) Mode' : 'Switch to Dark Mode'"
            aria-label="Toggle theme mode"
          >
            <span class="theme-btn-icon">{{ isDark ? "☀️" : "🌙" }}</span>
          </button>

          <!-- Settings Button -->
          <button
            class="top-right-btn settings-btn"
            @click="navigate('settings')"
            title="Settings"
            aria-label="Open settings"
          >
            <span>⚙️</span>
          </button>
        </div>
      </header>

      <div class="view-container">
        <DashboardView
          v-if="currentView === 'dashboard'"
          @navigate="navigate"
          @analyze-code="handleAnalyzeCode"
        />
        <AnalyzeView
          v-else-if="currentView === 'analyze'"
          :project-id="selectedProjectId"
          :initial-code="pendingAnalysisData?.code"
          :initial-filename="pendingAnalysisData?.filename"
          :initial-language="pendingAnalysisData?.language"
        />
        <HistoryView v-else-if="currentView === 'history'" @back-to-analyze="navigate('analyze')" />
        <RepositoriesView
          v-else-if="currentView === 'repositories'"
          @analyze-project="analyzeProject"
        />
        <SettingsView v-else-if="currentView === 'settings'" />
        <ContactView v-else-if="currentView === 'contact'" />
      </div>
    </main>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

/* Font variables */
:root {
  --font-display: 'Syne', 'Space Grotesk', -apple-system, sans-serif;
  --font-heading: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body {
  font-family: var(--font-body);
  background: #06040b;
  color: #f8fafc;
  transition: background-color 0.25s ease, color 0.25s ease;
}

/* ==========================================================================
   Light Mode (Non-Dark Mode) - Retro Warm Cream & Sunshine Yellow Palette
   ========================================================================== */
body.light-theme {
  background: #f4f0ea;
  color: #000000;
}

body.light-theme .app-container {
  background: #f4f0ea;
}

body.light-theme .main-content {
  background: #f4f0ea;
}

body.light-theme .app-header {
  background: #f4f0ea;
  border-bottom: 2px solid #000000;
}

body.light-theme .header-titles h1 {
  color: #000000;
  font-family: var(--font-heading);
  font-weight: 800;
  letter-spacing: -0.02em;
}

body.light-theme .subtitle {
  color: #52525b;
}

body.light-theme .status-pill-local {
  background: #86efac;
  border: 1.5px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

body.light-theme .status-pill-local .dot-green {
  background: #000000;
}

body.light-theme .top-right-btn {
  background: #ffffff;
  border: 2px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

body.light-theme .top-right-btn:hover {
  background: #ffd738;
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px #000000;
}

/* Common Header Styles */
.app-header {
  background: rgba(10, 7, 18, 0.75);
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  padding: 1.25rem 2.5rem;
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-titles h1 {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  letter-spacing: -0.01em;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.88rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-pill-local {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.dot-green {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.top-right-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.top-right-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(168, 85, 247, 0.4);
  transform: translateY(-1px);
}

.theme-btn-icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.top-right-btn:hover .theme-btn-icon {
  transform: rotate(20deg) scale(1.1);
}

.splash {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 0.75rem;
  text-align: center;
  color: #a5b4fc;
  background: #06040b;
}
.splash-mark {
  color: #a855f7;
  font-size: 2.5rem;
  filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.7));
}

.auth-shell {
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 20%, rgba(124, 58, 237, 0.22) 0%, #06040b 70%);
}

body.light-theme .auth-shell {
  background: #f4f0ea;
}

.app-container {
  display: flex;
  min-height: 100vh;
  background: #06040b;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124, 58, 237, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 90% 40% at 50% 115%, rgba(124, 58, 237, 0.2) 0%, transparent 60%),
              #07040e;
  min-width: 0;
  min-height: 100vh;
}
.app-container:has(.sidebar.collapsed) .main-content { margin-left: 70px; }

.view-container { flex: 1; overflow: auto; }

.auth-error-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  padding: 0.9rem 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
}
.auth-error-banner span { flex: 1; font-size: 0.9rem; }
.auth-error-banner .close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}

/* ==========================================================================
   Universal Light Theme (Non-Dark Mode) Component Overrides
   ========================================================================== */
body.light-theme .card,
body.light-theme .panel {
  background: #ffffff !important;
  border: 2px solid #000000 !important;
  box-shadow: 3px 3px 0px #000000 !important;
  color: #000000 !important;
}

body.light-theme .card-header,
body.light-theme .panel-header {
  border-bottom: 1.5px solid #000000;
}

body.light-theme input,
body.light-theme select,
body.light-theme textarea {
  background: #ffffff !important;
  border: 1.5px solid #000000 !important;
  color: #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
}

body.light-theme input:focus,
body.light-theme select:focus,
body.light-theme textarea:focus {
  outline: 2px solid #000000 !important;
  border-color: #000000 !important;
}

body.light-theme .primary,
body.light-theme .btn-primary {
  background: #ffd738 !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  box-shadow: 3px 3px 0px #000000 !important;
  font-weight: 800 !important;
}

body.light-theme .secondary,
body.light-theme .btn-secondary {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1.5px solid #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
  font-weight: 700 !important;
}

body.light-theme .huge-card,
body.light-theme .triplet-card {
  background: #ffffff !important;
  border: 2px solid #000000 !important;
  box-shadow: 4px 4px 0px #000000 !important;
  color: #000000 !important;
}

body.light-theme .huge-card h2,
body.light-theme .triplet-card h4 {
  color: #000000 !important;
  font-family: var(--font-heading) !important;
  font-weight: 800 !important;
}

body.light-theme .huge-card p,
body.light-theme .triplet-card p {
  color: #52525b !important;
}

body.light-theme .white-link-btn {
  background: #ffffff !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  box-shadow: 3px 3px 0px #000000 !important;
}

body.light-theme .primary-email-btn {
  background: #ffd738 !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  box-shadow: 3px 3px 0px #000000 !important;
}

body.light-theme .btn-email-me {
  background: #ffffff !important;
  color: #000000 !important;
  border: 2px solid #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
}

body.light-theme .btn-email-me:hover {
  background: #ffd738 !important;
  color: #000000 !important;
}
</style>
