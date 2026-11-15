<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import type { ViewId } from "@/types/navigation";

const props = defineProps<{ active: ViewId }>();
const emit = defineEmits<{ navigate: [view: ViewId] }>();

const isCollapsed = ref(false);
const { user, isLoading, signOut } = useAuth();

const items: Array<{ id: ViewId; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "analyze", label: "Analyze", icon: "🔍" },
  { id: "history", label: "History", icon: "📋" },
  { id: "repositories", label: "Repositories", icon: "🗂" },
  { id: "ai", label: "AI Review", icon: "🤖" },
  { id: "settings", label: "Settings", icon: "⚙️" }
];

const displayName = computed(() => {
  if (!user.value) return "";
  return user.value.name || user.value.email.split("@")[0];
});

const initials = computed(() => {
  const name = displayName.value.trim();
  if (!name) return "?";
  const parts = name.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
});

function handleSignOut(): void {
  if (confirm("Are you sure you want to sign out?")) {
    void signOut();
  }
}
</script>

<template>
  <aside :class="['sidebar', { collapsed: isCollapsed }]">
    <button class="toggle-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <span class="toggle-icon">{{ isCollapsed ? "▶" : "◀" }}</span>
    </button>

    <div class="sidebar-content">
      <div class="brand">
        <span class="brand-mark">◆</span>
        <span v-if="!isCollapsed" class="brand-text"><strong>DevMate AI</strong></span>
      </div>

      <div v-if="user" class="user-section">
        <div class="user-info">
          <span class="user-avatar">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="displayName" />
            <template v-else>{{ initials }}</template>
          </span>
          <div v-if="!isCollapsed" class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div class="user-email">{{ user.email }}</div>
            <button class="btn-sign-out" :disabled="isLoading" @click="handleSignOut">
              {{ isLoading ? "Signing out…" : "Sign out" }}
            </button>
          </div>
        </div>
      </div>

      <nav class="nav-menu">
        <button
          v-for="item in items"
          :key="item.id"
          :class="['nav-item', { active: props.active === item.id }]"
          @click="emit('navigate', item.id)"
          :title="isCollapsed ? item.label : ''"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <div v-if="!isCollapsed" class="sidebar-footer">
        <span class="footer-note">DevMate AI · {{ user?.provider === "github" ? "GitHub account" : "Email account" }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: linear-gradient(180deg, #0b0c0e 0%, #2a2d35 100%);
  border-right: 1px solid #3a3d45;
  display: flex;
  flex-direction: column;
  width: 260px;
  transition: width 0.3s ease;
  z-index: 100;
}
.sidebar.collapsed { width: 70px; }
.toggle-btn {
  position: absolute;
  right: -12px;
  top: 20px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2px solid #0b0c0e;
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-weight: 700;
}
.toggle-btn:hover { background: #fcd34d; transform: scale(1.1); }
.toggle-icon { font-size: 10px; }
.sidebar-content { display: flex; flex-direction: column; height: 100%; padding: 1.5rem 0; overflow: hidden; }

.brand { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.5rem; margin-bottom: 1.75rem; }
.collapsed .brand { justify-content: center; padding: 0; }
.brand-mark { font-size: 1.5rem; color: #fbbf24; flex-shrink: 0; }
.brand-text strong { color: white; font-size: 1.1rem; }

.user-section { padding: 0 1.25rem; margin-bottom: 1.75rem; }
.collapsed .user-section { padding: 0 0.75rem; }
.user-info { display: flex; align-items: center; gap: 0.7rem; }
.collapsed .user-info { justify-content: center; }
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #fbbf24;
  background: #1f2530;
  color: #fbbf24;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  overflow: hidden;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-details { display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }
.user-name { color: white; font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-email { color: #9ca3af; font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-sign-out {
  margin-top: 0.45rem;
  padding: 0.35rem 0.7rem;
  background: transparent;
  border: 1px solid #4b5563;
  border-radius: 4px;
  color: #d1d5db;
  font-size: 0.72rem;
  cursor: pointer;
}
.btn-sign-out:hover { background: #2a2d35; border-color: #6b7280; }
.btn-sign-out:disabled { opacity: 0.5; cursor: not-allowed; }

.nav-menu { display: flex; flex-direction: column; gap: 0.35rem; padding: 0 1rem; flex: 1; }
.collapsed .nav-menu { padding: 0 0.5rem; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #d1d5db;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.collapsed .nav-item { justify-content: center; padding: 0.8rem; }
.nav-item:hover { background: rgba(42, 45, 53, 0.7); }
.nav-item.active { background: #fbbf24; color: #000; font-weight: 600; }
.nav-icon { font-size: 1.05rem; flex-shrink: 0; }
.nav-label { font-weight: 500; white-space: nowrap; font-size: 0.9rem; }

.sidebar-footer { padding: 1rem 1.25rem 0; border-top: 1px solid #3a3d45; margin-top: auto; }
.footer-note { color: #64748b; font-size: 0.7rem; }
</style>
