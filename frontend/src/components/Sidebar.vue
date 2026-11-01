<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '@/composables/useAuth';

const isCollapsed = ref(false);
const { user, isLoading, login, logout } = useAuth();

// Computed properties
const isSignedIn = computed(() => user.value !== null);
const userName = computed(() => {
  if (!user.value) return '';
  if (user.value.firstName && user.value.lastName) {
    return `${user.value.firstName} ${user.value.lastName}`;
  }
  return user.value.firstName || user.value.email.split('@')[0];
});
const userAvatar = computed(() => {
  if (!user.value) return '';
  if (user.value.profileImage) {
    return user.value.profileImage;
  }
  const name = encodeURIComponent(userName.value);
  return `https://ui-avatars.com/api/?name=${name}&background=fbbf24&color=000`;
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const handleSignIn = () => {
  login();
};

const handleSignOut = async () => {
  if (confirm('Are you sure you want to sign out?')) {
    await logout();
  }
};

const emit = defineEmits<{
  navigate: [view: 'analyze' | 'history']
}>();

const currentView = ref<'analyze' | 'history'>('analyze');

const navigateTo = (view: 'analyze' | 'history') => {
  currentView.value = view;
  emit('navigate', view);
};
</script>

<template>
  <aside :class="['sidebar', { collapsed: isCollapsed }]">
    <!-- Toggle Button -->
    <button class="toggle-btn" @click="toggleSidebar" :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <span class="toggle-icon">{{ isCollapsed ? '▶' : '◀' }}</span>
    </button>

    <!-- Sidebar Content -->
    <div class="sidebar-content">
      <!-- Logo / Brand -->
      <div class="brand">
        <span class="brand-mark">◆</span>
        <span v-if="!isCollapsed" class="brand-text">
          <strong>DevMate AI</strong>
        </span>
      </div>

      <!-- User Section -->
      <div class="user-section">
        <div v-if="!isSignedIn" class="sign-in-prompt">
          <div v-if="!isCollapsed" class="prompt-text">
            <p>Sign in to save your analysis history</p>
          </div>
          <button 
            class="btn-sign-in" 
            @click="handleSignIn" 
            :disabled="isLoading"
            :title="isCollapsed ? 'Sign In' : ''"
          >
            <span class="icon">👤</span>
            <span v-if="!isCollapsed">{{ isLoading ? 'Loading...' : 'Sign In' }}</span>
          </button>
        </div>

        <div v-else class="user-info">
          <img :src="userAvatar" :alt="userName" class="user-avatar" />
          <div v-if="!isCollapsed" class="user-details">
            <div class="user-name">{{ userName }}</div>
            <div class="user-email">{{ user?.email }}</div>
            <button 
              class="btn-sign-out" 
              @click="handleSignOut"
              :disabled="isLoading"
            >
              {{ isLoading ? 'Signing out...' : 'Sign Out' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="nav-menu">
        <button 
          :class="['nav-item', { active: currentView === 'analyze' }]" 
          @click="navigateTo('analyze')"
          :title="isCollapsed ? 'Analyze' : ''"
        >
          <span class="nav-icon">🔍</span>
          <span v-if="!isCollapsed" class="nav-label">Analyze</span>
        </button>

        <button 
          :class="['nav-item', { active: currentView === 'history' }]" 
          @click="navigateTo('history')"
          :title="isCollapsed ? 'History' : ''"
        >
          <span class="nav-icon">📋</span>
          <span v-if="!isCollapsed" class="nav-label">History</span>
        </button>
      </nav>

      <!-- Footer / Additional Items (for future use) -->
      <div class="sidebar-footer">
        <button class="footer-item" :title="isCollapsed ? 'Settings' : ''">
          <span class="nav-icon">⚙️</span>
          <span v-if="!isCollapsed" class="nav-label">Settings</span>
        </button>
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
  background: #fbbf24;
  border: 2px solid #0b0c0e;
  color: #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  font-weight: 700;
}

.toggle-btn:hover {
  background: #fcd34d;
  transform: scale(1.1);
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

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.5rem;
  margin-bottom: 2rem;
}

.collapsed .brand {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  font-size: 1.5rem;
  color: #fbbf24;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  white-space: nowrap;
}

.brand-text strong {
  color: white;
  font-size: 1.1rem;
}

/* User Section */
.user-section {
  padding: 0 1.5rem;
  margin-bottom: 2rem;
}

.collapsed .user-section {
  padding: 0 0.75rem;
}

.sign-in-prompt {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prompt-text {
  font-size: 0.875rem;
  color: #9ca3af;
  line-height: 1.4;
}

.btn-sign-in {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #fbbf24;
  border: none;
  border-radius: 8px;
  color: #000000;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.btn-sign-in:hover {
  background: #fcd34d;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.btn-sign-in:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.collapsed .btn-sign-in {
  padding: 0.75rem;
}

.icon {
  font-size: 1.2rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.collapsed .user-info {
  justify-content: center;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #fbbf24;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow: hidden;
}

.user-name {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  color: #9ca3af;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-sign-out {
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid #4b5563;
  border-radius: 4px;
  color: #d1d5db;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sign-out:hover {
  background: #2a2d35;
  border-color: #6b7280;
}

.btn-sign-out:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Navigation */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem;
  flex: 1;
}

.collapsed .nav-menu {
  padding: 0 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #d1d5db;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 0.875rem;
}

.nav-item:hover {
  background: rgba(42, 45, 53, 0.7);
}

.nav-item.active {
  background: #fbbf24;
  color: #000000;
  font-weight: 600;
}

.nav-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.nav-label {
  font-weight: 500;
  white-space: nowrap;
}

/* Footer */
.sidebar-footer {
  padding: 0 1rem;
  margin-top: auto;
  border-top: 1px solid #3a3d45;
  padding-top: 1rem;
}

.collapsed .sidebar-footer {
  padding: 0 0.5rem;
  padding-top: 1rem;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.collapsed .footer-item {
  justify-content: center;
  padding: 0.75rem;
}

.footer-item:hover {
  background: rgba(42, 45, 53, 0.7);
  color: #d1d5db;
}
</style>
