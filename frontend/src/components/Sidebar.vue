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
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "contact", label: "Contact", icon: "💬" }
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
  background: linear-gradient(180deg, #090614 0%, #0d081c 100%);
  border-right: 1px solid rgba(139, 92, 246, 0.15);
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
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  border: 2px solid #06040b;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-weight: 700;
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
  transition: transform 0.15s, box-shadow 0.15s;
}
.toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 14px rgba(168, 85, 247, 0.8);
}
.toggle-icon { font-size: 10px; }
.sidebar-content { display: flex; flex-direction: column; height: 100%; padding: 1.5rem 0; overflow: hidden; }

.brand { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.5rem; margin-bottom: 1.75rem; }
.collapsed .brand { justify-content: center; padding: 0; }
.brand-mark {
  font-size: 1.5rem;
  color: #c084fc;
  filter: drop-shadow(0 0 8px rgba(192, 132, 252, 0.7));
  flex-shrink: 0;
}
.brand-text strong { color: white; font-size: 1.1rem; letter-spacing: -0.01em; }

.user-section { padding: 0 1.25rem; margin-bottom: 1.75rem; }
.collapsed .user-section { padding: 0 0.75rem; }
.user-info { display: flex; align-items: center; gap: 0.7rem; }
.collapsed .user-info { justify-content: center; }
.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #7c3aed;
  background: rgba(124, 58, 237, 0.2);
  color: #c4b5fd;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.3);
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-details { display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; }
.user-name { color: white; font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-email { color: #94a3b8; font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn-sign-out {
  margin-top: 0.45rem;
  padding: 0.35rem 0.7rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 6px;
  color: #c4b5fd;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-sign-out:hover {
  background: rgba(124, 58, 237, 0.25);
  border-color: rgba(168, 85, 247, 0.5);
  color: #ffffff;
}
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
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.collapsed .nav-item { justify-content: center; padding: 0.8rem; }
.nav-item:hover {
  background: rgba(139, 92, 246, 0.12);
  color: #ffffff;
}
.nav-item.active {
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 0 16px rgba(124, 58, 237, 0.35);
}
.nav-icon { font-size: 1.05rem; flex-shrink: 0; }
.nav-label { font-weight: 500; white-space: nowrap; font-size: 0.9rem; }

.sidebar-footer {
  padding: 1rem 1.25rem 0;
  border-top: 1px solid rgba(139, 92, 246, 0.15);
  margin-top: auto;
}
.footer-note { color: #64748b; font-size: 0.7rem; }

/* Light Theme Overrides (Warm Cream & Bold Ink) */
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
  background: #000000;
  color: #ffffff;
  font-weight: 800;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.25);
  border-radius: 8px;
}

:global(body.light-theme) .sidebar-footer {
  border-top: 1.5px solid #000000;
}

:global(body.light-theme) .footer-note {
  color: #52525b;
  font-weight: 600;
}
</style>
