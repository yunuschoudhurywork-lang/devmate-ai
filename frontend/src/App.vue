<script setup lang="ts">
import { ref } from "vue";
import AnalyzeView from "@/views/AnalyzeView.vue";
import HistoryView from "@/views/HistoryView.vue";

const currentView = ref<"analyze" | "history">("analyze");
</script>

<template>
  <div class="app-container">
    <header>
      <div>
        <span class="brand-mark">◆</span>
        <strong>DevMate AI</strong>
        <small>Code analysis workspace</small>
      </div>
      <nav class="nav-buttons">
        <button :class="{ active: currentView === 'analyze' }" @click="currentView = 'analyze'">Analyze</button>
        <button :class="{ active: currentView === 'history' }" @click="currentView = 'history'">History</button>
      </nav>
    </header>
    <AnalyzeView v-if="currentView === 'analyze'" />
    <HistoryView v-else-if="currentView === 'history'" />
  </div>
</template>

<style>
.app-container { min-height: 100vh; }
header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; background: #0f1729; border-bottom: 1px solid #1e3a5f; }
.nav-buttons { display: flex; gap: .5rem; }
.nav-buttons button { background: transparent; border: 1px solid #334155; border-radius: 6px; color: #cbd5e1; cursor: pointer; padding: .6rem 1.2rem; transition: all .2s; }
.nav-buttons button:hover { background: #1e3a5f; border-color: #0ea5e9; }
.nav-buttons button.active { background: #0284c7; border-color: #0284c7; color: white; }
</style>
