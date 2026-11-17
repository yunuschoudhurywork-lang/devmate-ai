<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import AuthPanel from "@/components/AuthPanel.vue";
import DashboardView from "@/views/DashboardView.vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import HistoryView from "@/views/HistoryView.vue";
import RepositoriesView from "@/views/RepositoriesView.vue";
import AiReviewView from "@/views/AIReviewView.vue";
import SettingsView from "@/views/SettingsView.vue";
import ContactView from "@/views/ContactView.vue";
import { useAuth } from "@/composables/useAuth";
import { VIEW_TITLES, type ViewId } from "@/types/navigation";

const currentView = ref<ViewId>("dashboard");
const selectedProjectId = ref<string | undefined>(undefined);
const { user, isLoading, restoreSession, checkAuthError, clearAuthError } = useAuth();
const authErrorMessage = ref<string | null>(null);

const heading = computed(() => VIEW_TITLES[currentView.value]);

function navigate(view: ViewId): void {
  currentView.value = view;
}

function analyzeProject(projectId: string): void {
  selectedProjectId.value = projectId;
  currentView.value = "analyze";
}

onMounted(async () => {
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
      <header>
        <div class="header-content">
          <h1>{{ heading.title }}</h1>
          <p class="subtitle">{{ heading.subtitle }}</p>
        </div>
      </header>

      <div class="view-container">
        <DashboardView v-if="currentView === 'dashboard'" @navigate="navigate" />
        <AnalyzeView v-else-if="currentView === 'analyze'" :project-id="selectedProjectId" />
        <HistoryView v-else-if="currentView === 'history'" @back-to-analyze="navigate('analyze')" />
        <RepositoriesView
          v-else-if="currentView === 'repositories'"
          @analyze-project="analyzeProject"
        />
        <AiReviewView v-else-if="currentView === 'ai'" />
        <SettingsView v-else-if="currentView === 'settings'" />
        <ContactView v-else-if="currentView === 'contact'" />
      </div>
    </main>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #06040b;
  color: #f8fafc;
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

header {
  background: rgba(10, 7, 18, 0.75);
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  padding: 1.75rem 2.5rem;
  backdrop-filter: blur(16px);
}
.header-content h1 {
  color: #ffffff;
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  letter-spacing: -0.01em;
}
.subtitle { color: #94a3b8; font-size: 0.9rem; }

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
</style>
