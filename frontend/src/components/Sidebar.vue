<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import type { ViewId } from "@/types/navigation";

const props = defineProps<{ active: ViewId }>();
const emit = defineEmits<{ navigate: [view: ViewId] }>();

const isCollapsed = ref(false);
const { user, isLoading, signOut } = useAuth();

const items: Array<{ id: ViewId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "analyze", label: "Analyze" },
  { id: "history", label: "History" },
  { id: "repositories", label: "Repositories" },
  { id: "settings", label: "Settings" },
  { id: "contact", label: "Support" }
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
    <button
      class="toggle-btn"
      @click="isCollapsed = !isCollapsed"
      :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      aria-label="Toggle sidebar width"
    >
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
          <span class="nav-icon">
            <!-- Dashboard: Metrics & Grid -->
            <svg
              v-if="item.id === 'dashboard'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>

            <!-- Analyze: Code Inspection & Scanner -->
            <svg
              v-else-if="item.id === 'analyze'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="7.5" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
              <polyline points="9 9.5 7.5 11 9 12.5" />
              <polyline points="13 9.5 14.5 11 13 12.5" />
            </svg>

            <!-- History: Chronology & Audit Log -->
            <svg
              v-else-if="item.id === 'history'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <polyline points="12 7 12 12 15 15" />
            </svg>

            <!-- Repositories: Original GitHub Octocat Logo -->
            <svg
              v-else-if="item.id === 'repositories'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>

            <!-- Settings: Gear / Configuration -->
            <svg
              v-else-if="item.id === 'settings'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>

            <!-- Support / Contact: Chat & Assistance -->
            <svg
              v-else-if="item.id === 'contact'"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
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
/* ==========================================================================
   Left Sidebar - Pure Blue & Cyan Theme (#0f172a & #67e8f9)
   ========================================================================== */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: linear-gradient(180deg, #070c18 0%, #0a1324 50%, #0f172a 100%);
  border-right: 1px solid rgba(103, 232, 249, 0.15);
  display: flex;
  flex-direction: column;
  width: 260px;
  transition: width 0.3s ease;
  z-index: 100;
}

.sidebar.collapsed {
  width: 70px;
}

.toggle-btn {
  position: absolute;
  right: -12px;
  top: 20px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a 0%, #0284c7 100%);
  border: 1.5px solid #67e8f9;
  color: #67e8f9;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(103, 232, 249, 0.45);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.toggle-btn:hover {
  transform: scale(1.12);
  box-shadow: 0 0 14px rgba(103, 232, 249, 0.85);
}

.toggle-icon {
  font-size: 10px;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem 0;
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.5rem;
  margin-bottom: 1.75rem;
}

.collapsed .brand {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  font-size: 1.5rem;
  color: #67e8f9;
  filter: drop-shadow(0 0 8px rgba(103, 232, 249, 0.7));
  flex-shrink: 0;
}

.brand-text strong {
  color: #ffffff;
  font-size: 1.1rem;
  letter-spacing: -0.01em;
}

.user-section {
  padding: 0 1.25rem;
  margin-bottom: 1.75rem;
}

.collapsed .user-section {
  padding: 0 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.collapsed .user-info {
  justify-content: center;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #0284c7;
  background: rgba(14, 165, 233, 0.18);
  color: #67e8f9;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.35);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow: hidden;
}

.user-name {
  color: #ffffff;
  font-weight: 600;
  font-size: 0.88rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  color: #64748b;
  font-size: 0.72rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-sign-out {
  margin-top: 0.45rem;
  padding: 0.35rem 0.7rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(103, 232, 249, 0.3);
  border-radius: 6px;
  color: #67e8f9;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-sign-out:hover {
  background: rgba(103, 232, 249, 0.15);
  border-color: #67e8f9;
  color: #ffffff;
}

.btn-sign-out:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Nav Menu */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0 1rem;
  flex: 1;
}

.collapsed .nav-menu {
  padding: 0 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem 1rem;
  background: transparent;
  border: 1.5px solid transparent;
  border-radius: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  width: 100%;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 0.8rem;
}

.nav-item:hover {
  background: rgba(15, 23, 42, 0.85);
  color: #67e8f9;
  border-color: rgba(103, 232, 249, 0.25);
}

/* Selected / Active State: Signature #0f172a & #67e8f9 combination */
.nav-item.active {
  background: #0f172a;
  color: #67e8f9;
  border: 1.5px solid #67e8f9;
  font-weight: 700;
  box-shadow: 0 0 16px rgba(103, 232, 249, 0.35), inset 0 0 10px rgba(103, 232, 249, 0.12);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: currentColor;
  transition: transform 0.18s ease, color 0.18s ease, filter 0.18s ease;
}

.nav-icon svg {
  width: 20px;
  height: 20px;
  display: block;
}

.nav-item:hover .nav-icon {
  transform: scale(1.08);
  color: #67e8f9;
}

.nav-item.active .nav-icon {
  color: #67e8f9;
  filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.65));
}

.nav-label {
  font-weight: 500;
  white-space: nowrap;
  font-size: 0.9rem;
}

.nav-item.active .nav-label {
  color: #67e8f9;
  font-weight: 700;
}

.sidebar-footer {
  padding: 1rem 1.25rem 0;
  border-top: 1px solid rgba(103, 232, 249, 0.15);
  margin-top: auto;
}

.footer-note {
  color: #64748b;
  font-size: 0.7rem;
}

/* Light Theme Overrides (Clean Retro Neutral with Signature #0f172a & #67e8f9 active state) */
:global(body.light-theme) .sidebar {
  background: #f8f6f0;
  border-right: 2px solid #000000;
}

:global(body.light-theme) .brand-mark {
  color: #000000;
  filter: none;
}

:global(body.light-theme) .brand-text strong {
  color: #000000;
  font-family: var(--font-heading, sans-serif);
  font-weight: 800;
}

:global(body.light-theme) .toggle-btn {
  background: #ffffff;
  border: 2px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .toggle-btn:hover {
  background: #ffd738;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .user-avatar {
  background: #ffd738;
  border: 2px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .user-name {
  color: #000000;
  font-weight: 700;
}

:global(body.light-theme) .user-email {
  color: #52525b;
}

:global(body.light-theme) .btn-sign-out {
  background: #ffffff;
  border: 1.5px solid #000000;
  color: #000000;
  box-shadow: 1px 1px 0px #000000;
  font-weight: 600;
}

:global(body.light-theme) .btn-sign-out:hover {
  background: #fee2e2;
}

:global(body.light-theme) .nav-item {
  color: #18181b;
  font-weight: 600;
}

:global(body.light-theme) .nav-item:hover {
  background: #f1eee7;
  color: #000000;
}

:global(body.light-theme) .nav-item.active {
  background: #0f172a;
  color: #67e8f9;
  border: 2px solid #000000;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .nav-item.active .nav-icon,
:global(body.light-theme) .nav-item.active .nav-label {
  color: #67e8f9;
}

:global(body.light-theme) .sidebar-footer {
  border-top: 1.5px solid #000000;
}

:global(body.light-theme) .footer-note {
  color: #52525b;
  font-weight: 600;
}
</style>
