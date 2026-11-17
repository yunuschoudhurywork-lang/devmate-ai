<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAuthConfig } from "@/services/api";
import { useAuth } from "@/composables/useAuth";
import { useTheme } from "@/composables/useTheme";

const { signIn, signUp, loginWithGitHub, isLoading, error } = useAuth();
const { isDark, toggleTheme } = useTheme();

const mode = ref<"login" | "signup">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const githubEnabled = ref(false);
const localError = ref("");

onMounted(async () => {
  try {
    githubEnabled.value = (await getAuthConfig()).githubEnabled;
  } catch {
    githubEnabled.value = false;
  }
});

async function submit(): Promise<void> {
  localError.value = "";

  if (!email.value.trim() || !password.value) {
    localError.value = "Email and password are required.";
    return;
  }

  if (password.value.length < 8) {
    localError.value = "Password must be at least 8 characters.";
    return;
  }

  const ok =
    mode.value === "login"
      ? await signIn(email.value.trim(), password.value)
      : await signUp(name.value.trim(), email.value.trim(), password.value);

  if (ok) {
    password.value = "";
    window.location.href = "/";
  }
}

function switchMode(next: "login" | "signup"): void {
  mode.value = next;
  localError.value = "";
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-card">
      <!-- Card Brand & Theme Toggle Header -->
      <div class="card-top-row">
        <div class="brand">
          <span class="brand-spark">◆</span>
          <span class="brand-title">DevMate <strong>AI</strong></span>
        </div>

        <button
          class="theme-toggle-btn"
          @click="toggleTheme"
          :title="isDark ? 'Switch to Non-Dark (Light) Mode' : 'Switch to Dark Mode'"
          aria-label="Toggle theme mode"
          type="button"
        >
          <span class="theme-icon">{{ isDark ? "☀️" : "🌙" }}</span>
        </button>
      </div>

      <!-- Card Title & Subtitle -->
      <div class="card-header">
        <div class="title-with-pill">
          <h2>{{ mode === "login" ? "Sign in to your account" : "Create your account" }}</h2>
          <span class="auth-pill">{{ mode === "login" ? "Sign In" : "Sign Up" }}</span>
        </div>
        <p class="subtitle">
          {{ mode === "login"
            ? "Enter your credentials below to access your workspace and code reviews."
            : "Sign up in seconds to start analyzing code across JS, TS, Python, and Java." }}
        </p>
      </div>

      <!-- Segmented Tab Switcher -->
      <div class="segmented-tabs" role="tablist">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
          role="tab"
          :aria-selected="mode === 'login'"
        >
          Sign In
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: mode === 'signup' }"
          @click="switchMode('signup')"
          role="tab"
          :aria-selected="mode === 'signup'"
        >
          Create Account
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="auth-form" novalidate>
        <!-- Full Name (Sign Up only) -->
        <div v-if="mode === 'signup'" class="form-field">
          <label for="name">Full Name</label>
          <div class="input-wrap">
            <span class="input-icon">👤</span>
            <input
              id="name"
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="e.g. Ada Lovelace"
              required
            />
          </div>
        </div>

        <!-- Email -->
        <div class="form-field">
          <label for="email">Email Address</label>
          <div class="input-wrap">
            <span class="input-icon">✉️</span>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <!-- Password -->
        <div class="form-field">
          <div class="password-label-row">
            <label for="password">Password</label>
            <span v-if="mode === 'signup'" class="field-hint">Min 8 characters</span>
          </div>
          <div class="input-wrap">
            <span class="input-icon">🔑</span>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              class="btn-eye"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Hide password' : 'Show password'"
              tabindex="-1"
            >
              <span>{{ showPassword ? "👁️" : "👁️‍🗨️" }}</span>
            </button>
          </div>
        </div>

        <!-- Error Banner -->
        <div v-if="localError || error" class="auth-error" role="alert">
          <span class="error-icon">⚠️</span>
          <span class="error-msg">{{ localError || error }}</span>
        </div>

        <!-- Submit Button -->
        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="isLoading" class="spinner"></span>
          <span>{{ isLoading ? "Authenticating…" : mode === "login" ? "Sign In to DevMate →" : "Create Account →" }}</span>
        </button>
      </form>

      <!-- GitHub OAuth Button (if enabled) -->
      <template v-if="githubEnabled">
        <div class="auth-divider">
          <span>or continue with</span>
        </div>
        <button class="btn-github" type="button" @click="loginWithGitHub">
          <svg class="github-svg" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>Continue with GitHub</span>
        </button>
      </template>

      <!-- Quick Test Tip -->
      <div class="test-account-tip">
        <span class="tip-spark">💡</span>
        <p>
          <strong>Quick Start:</strong> Enter any email &amp; 8+ character password to begin testing immediately.
        </p>
      </div>

      <!-- Card Footer -->
      <footer class="card-footer">
        <span class="lock-icon">🔒</span>
        <span>Your code, reports, and AI reviews are private to your account.</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.25rem;
  position: relative;
  z-index: 10;
}

.auth-card {
  width: min(460px, 100%);
  background: rgba(14, 10, 26, 0.88);
  border: 1px solid rgba(139, 92, 246, 0.28);
  border-radius: 18px;
  padding: 2.25rem 2rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.65), 0 0 32px rgba(139, 92, 246, 0.15);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Card Brand & Theme Toggle Header */
.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-spark {
  color: #a855f7;
  font-size: 1.4rem;
  filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.8));
}

.brand-title {
  font-size: 1.2rem;
  color: #f8fafc;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-title strong {
  color: #a855f7;
}

.theme-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(168, 85, 247, 0.4);
  transform: translateY(-1px);
}

/* Card Header */
.card-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.title-with-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h2 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
  letter-spacing: -0.01em;
}

.auth-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.18rem 0.55rem;
  border-radius: 6px;
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
}

.subtitle {
  color: #94a3b8;
  font-size: 0.85rem;
  line-height: 1.45;
  margin: 0;
}

/* Segmented Tabs */
.segmented-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.25rem;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  color: #cbd5e1;
  font-size: 0.82rem;
  font-weight: 600;
}

.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-hint {
  font-size: 0.72rem;
  color: #64748b;
  font-family: var(--font-mono, monospace);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  font-size: 0.95rem;
  pointer-events: none;
  opacity: 0.7;
}

.input-wrap input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  color: #f8fafc;
  padding: 0.72rem 0.85rem 0.72rem 2.45rem;
  font-size: 0.92rem;
  transition: all 0.2s ease;
}

.input-wrap input:focus {
  outline: none;
  border-color: #a855f7;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.25);
}

.btn-eye {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.btn-eye:hover {
  opacity: 1;
}

/* Error Banner */
.auth-error {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
  color: #fca5a5;
  font-size: 0.84rem;
}

.error-icon {
  font-size: 0.95rem;
}

/* Submit Button */
.btn-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.8rem;
  border-radius: 9px;
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
  border: 1px solid rgba(168, 85, 247, 0.4);
  color: #ffffff;
  font-size: 0.94rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.45);
  margin-top: 0.2rem;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(124, 58, 237, 0.65);
}

.btn-submit:disabled {
  opacity: 0.65;
  cursor: wait;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Divider & GitHub OAuth */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  color: #64748b;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0.1rem 0;
}

.auth-divider::before,
.auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.btn-github {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  color: #f1f5f9;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.72rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-github:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.github-svg {
  width: 17px;
  height: 17px;
}

/* Quick Test Tip */
.test-account-tip {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(255, 215, 56, 0.07);
  border: 1px solid rgba(255, 215, 56, 0.25);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #fef08a;
}

.test-account-tip strong {
  color: #ffd738;
}

.test-account-tip p {
  margin: 0;
}

.tip-spark {
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* Card Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: #64748b;
  font-size: 0.72rem;
  text-align: center;
  line-height: 1.4;
}

.lock-icon {
  font-size: 0.75rem;
}

/* ==========================================================================
   Light Theme (Non-Dark Mode) Overrides
   ========================================================================== */
:global(body.light-theme) .auth-card {
  background: #ffffff;
  border: 2.5px solid #000000;
  box-shadow: 6px 6px 0px #000000;
}

:global(body.light-theme) .card-top-row {
  border-bottom: 1.5px solid #000000;
}

:global(body.light-theme) .brand-title {
  color: #000000;
}

:global(body.light-theme) .brand-title strong {
  color: #000000;
}

:global(body.light-theme) .brand-spark {
  color: #000000;
  filter: none;
}

:global(body.light-theme) .theme-toggle-btn {
  background: #ffffff;
  border: 2px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .theme-toggle-btn:hover {
  background: #ffd738;
}

:global(body.light-theme) .card-header h2 {
  color: #000000;
  font-family: var(--font-heading, sans-serif);
  font-weight: 800;
}

:global(body.light-theme) .subtitle {
  color: #52525b;
}

:global(body.light-theme) .auth-pill {
  background: #ffd738;
  border: 1.5px solid #000000;
  color: #000000;
}

:global(body.light-theme) .segmented-tabs {
  background: #f4f0ea;
  border: 1.5px solid #000000;
}

:global(body.light-theme) .tab-btn {
  color: #52525b;
}

:global(body.light-theme) .tab-btn.active {
  background: #000000;
  color: #ffffff;
  box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.2);
  font-weight: 800;
}

:global(body.light-theme) .form-field label {
  color: #000000;
}

:global(body.light-theme) .input-wrap input {
  background: #ffffff;
  border: 1.5px solid #000000;
  color: #000000;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .input-wrap input:focus {
  border-color: #000000;
  outline: 2px solid #000000;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .btn-submit {
  background: #ffd738;
  color: #000000;
  border: 2px solid #000000;
  box-shadow: 4px 4px 0px #000000;
  font-weight: 900;
}

:global(body.light-theme) .btn-submit:hover:not(:disabled) {
  background: #ffdb58;
  box-shadow: 5px 5px 0px #000000;
}

:global(body.light-theme) .auth-divider {
  color: #71717a;
}

:global(body.light-theme) .auth-divider::before,
:global(body.light-theme) .auth-divider::after {
  background: #000000;
}

:global(body.light-theme) .btn-github {
  background: #ffffff;
  border: 2px solid #000000;
  color: #000000;
  box-shadow: 3px 3px 0px #000000;
}

:global(body.light-theme) .btn-github:hover {
  background: #f4f0ea;
}

:global(body.light-theme) .test-account-tip {
  background: #fffbeb;
  border: 1.5px solid #000000;
  color: #18181b;
  box-shadow: 2px 2px 0px #000000;
}

:global(body.light-theme) .test-account-tip strong {
  color: #000000;
}

:global(body.light-theme) .card-footer {
  color: #52525b;
}
</style>
