<script setup lang="ts">
import { ref } from "vue";
import Sidebar from "@/components/Sidebar.vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import HistoryView from "@/views/HistoryView.vue";

const currentView = ref<"analyze" | "history">("analyze");

const handleNavigation = (view: "analyze" | "history") => {
  currentView.value = view;
};
</script>

<template>
  <div class="app-container">
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
        <HistoryView v-else-if="currentView === 'history'" />
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
  background: #0a0f1e;
  color: #e2e8f0;
}

.app-container {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
}

/* Adjust for collapsed sidebar */
.app-container:has(.sidebar.collapsed) .main-content {
  margin-left: 70px;
}

header {
  background: #0f1729;
  border-bottom: 1px solid #1e3a5f;
  padding: 2rem 2.5rem;
}

.header-content h1 {
  color: white;
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
}

.view-container {
  flex: 1;
  overflow: auto;
}
</style>
