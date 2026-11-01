<script setup lang="ts">
import { ref, onMounted } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import HistoryView from "@/views/HistoryView.vue";
import { useAuth } from "@/composables/useAuth";

const currentView = ref<"analyze" | "history">("analyze");
const { restoreSession, checkAuthError, clearAuthError, error: authError } = useAuth();
const authErrorMessage = ref<string | null>(null);

const handleNavigation = (view: "analyze" | "history") => {
  currentView.value = view;
};

onMounted(async () => {
  // Check for authentication errors in URL
  const urlError = checkAuthError();
  if (urlError) {
    authErrorMessage.value = urlError;
    clearAuthError();
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      authErrorMessage.value = null;
    }, 5000);
  }

  // Restore user session
  await restoreSession();
});
</script>

<template>
  <div class="app-container">
    <!-- Authentication error banner -->
    <div v-if="authErrorMessage" class="auth-error-banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ authErrorMessage }}</span>
      <button @click="authErrorMessage = null" class="close-btn">×</button>
    </div>

    <Sidebar @navigate="handleNavigation" />
    
    <main class="main-content">
      <header>
        <div class="header-content">
          <h1>{{ currentView === 'analyze' ? 'Code Analysis' : 'Analysis History' }}</h1>
          <p class="subtitle">
            {{ currentView === 'analyze' 
              ? 'Analyze your code for quality, security, and performance issues' 
              : 'View and manage your past analysis reports' 
            }}
          </p>
        </div>
      </header>
      
      <div class="view-container">
        <AnalyzeView v-if="currentView === 'analyze'" />
        <HistoryView v-else-if="currentView === 'history'" @back-to-analyze="currentView = 'analyze'" />
      </div>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #0b0c0e;
  color: #e2e8f0;
}

.app-container {
  display: flex;
  min-height: 100vh;
  background: #0b0c0e;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0b0c0e 0%, #2a2d35 100%);
}

/* Adjust for collapsed sidebar */
.app-container:has(.sidebar.collapsed) .main-content {
  margin-left: 70px;
}

header {
  background: rgba(42, 45, 53, 0.5);
  border-bottom: 1px solid #3a3d45;
  padding: 2rem 2.5rem;
  backdrop-filter: blur(10px);
}

.header-content h1 {
  color: white;
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #9ca3af;
  font-size: 0.95rem;
}

.view-container {
  flex: 1;
  overflow: auto;
}

/* Authentication error banner */
.auth-error-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  color: white;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.auth-error-banner svg {
  flex-shrink: 0;
}

.auth-error-banner span {
  flex: 1;
  font-size: 0.95rem;
}

.auth-error-banner .close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.auth-error-banner .close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.auth-error-banner + .app-container {
  padding-top: 60px;
}
</style>
