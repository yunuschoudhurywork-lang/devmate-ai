<script setup lang="ts">
import { ref } from 'vue';

const isCollapsed = ref(false);
const isSignedIn = ref(false);
const showSignInModal = ref(false);

// User data (will be populated after sign in)
const user = ref({
  name: '',
  email: '',
  avatar: ''
});

// Sign in form data
const signInForm = ref({
  email: '',
  password: ''
});

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

const openSignIn = () => {
  showSignInModal.value = true;
};

const closeSignIn = () => {
  showSignInModal.value = false;
  signInForm.value = { email: '', password: '' };
};

const handleSignIn = () => {
  // TODO: Implement actual authentication in Phase 5
  // For now, just simulate sign in
  user.value = {
    name: signInForm.value.email.split('@')[0],
    email: signInForm.value.email,
    avatar: `https://ui-avatars.com/api/?name=${signInForm.value.email.split('@')[0]}&background=0284c7&color=fff`
  };
  isSignedIn.value = true;
  closeSignIn();
};

const handleSignOut = () => {
  isSignedIn.value = false;
  user.value = { name: '', email: '', avatar: '' };
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
          <button class="btn-sign-in" @click="openSignIn" :title="isCollapsed ? 'Sign In' : ''">
            <span class="icon">👤</span>
            <span v-if="!isCollapsed">Sign In</span>
          </button>
        </div>

        <div v-else class="user-info">
          <img :src="user.avatar" :alt="user.name" class="user-avatar" />
          <div v-if="!isCollapsed" class="user-details">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-email">{{ user.email }}</div>
            <button class="btn-sign-out" @click="handleSignOut">Sign Out</button>
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

    <!-- Sign In Modal -->
    <Teleport to="body">
      <div v-if="showSignInModal" class="modal-overlay" @click="closeSignIn">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Sign In to DevMate AI</h2>
            <button class="btn-close" @click="closeSignIn">✕</button>
          </div>

          <form @submit.prevent="handleSignIn" class="sign-in-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                id="email"
                v-model="signInForm.email" 
                type="email" 
                placeholder="your@email.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input 
                id="password"
                v-model="signInForm.password" 
                type="password" 
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
            </div>

            <div class="form-notice">
              <p>⚠️ Authentication is not yet implemented (Phase 5)</p>
              <p>This is a UI preview. Any email will work for demo.</p>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeSignIn">Cancel</button>
              <button type="submit" class="btn-primary">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: #0f1729;
  border-right: 1px solid #1e3a5f;
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
  background: #0284c7;
  border: 2px solid #0f1729;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
}

.toggle-btn:hover {
  background: #0ea5e9;
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
  color: #0ea5e9;
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
  color: #94a3b8;
  line-height: 1.4;
}

.btn-sign-in {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #0284c7;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.btn-sign-in:hover {
  background: #0ea5e9;
  transform: translateY(-1px);
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
  color: #94a3b8;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-sign-out {
  margin-top: 0.5rem;
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #cbd5e1;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sign-out:hover {
  background: #1e293b;
  border-color: #475569;
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
  color: #cbd5e1;
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
  background: #1e3a5f;
}

.nav-item.active {
  background: #0284c7;
  color: white;
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
  border-top: 1px solid #1e3a5f;
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
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.collapsed .footer-item {
  justify-content: center;
  padding: 0.75rem;
}

.footer-item:hover {
  background: #1e293b;
  color: #cbd5e1;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #0f1729;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #1e3a5f;
}

.modal-header h2 {
  color: white;
  margin: 0;
  font-size: 1.25rem;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #1e293b;
  color: white;
}

.sign-in-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  color: #cbd5e1;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #0284c7;
  background: #0f172a;
}

.form-group input::placeholder {
  color: #64748b;
}

.form-notice {
  background: #422006;
  border: 1px solid #92400e;
  border-radius: 6px;
  padding: 0.875rem;
  margin-bottom: 1.25rem;
}

.form-notice p {
  color: #fbbf24;
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.5;
}

.form-notice p:first-child {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary,
.btn-primary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #334155;
  color: #cbd5e1;
}

.btn-secondary:hover {
  background: #1e293b;
}

.btn-primary {
  background: #0284c7;
  color: white;
}

.btn-primary:hover {
  background: #0ea5e9;
  transform: translateY(-1px);
}
</style>
