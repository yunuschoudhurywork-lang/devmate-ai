<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAuthConfig } from "@/services/api";
import { useAuth } from "@/composables/useAuth";

const { signIn, signUp, loginWithGitHub, isLoading, error } = useAuth();

const mode = ref<"login" | "signup">("login");
const name = ref("");
const email = ref("");
const password = ref("");
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
      <div class="brand">
        <span class="brand-mark">◆</span>
        <div>
          <h1>DevMate AI</h1>
          <p>Automated code review, saved history and AI insights.</p>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="switchMode('login')">Sign in</button>
        <button :class="{ active: mode === 'signup' }" @click="switchMode('signup')">Create account</button>
      </div>

      <form @submit.prevent="submit">
        <label v-if="mode === 'signup'">
          Name
          <input v-model="name" type="text" autocomplete="name" placeholder="Ada Lovelace" />
        </label>

        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required />
        </label>

        <label>
          Password
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="At least 8 characters"
            required
          />
        </label>

        <p v-if="localError || error" class="error" role="alert">{{ localError || error }}</p>

        <button type="submit" class="primary" :disabled="isLoading">
          {{ isLoading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account" }}
        </button>
      </form>

      <template v-if="githubEnabled">
        <div class="divider"><span>or</span></div>
        <button class="github" type="button" @click="loginWithGitHub">
          <span class="github-mark">⌘</span> Continue with GitHub
        </button>
      </template>

      <p class="notice">
        Your analyses, reports and AI artifacts are private to your account.
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
}
.auth-card {
  width: min(430px, 100%);
  background: rgba(17, 20, 26, 0.92);
  border: 1px solid #2f3542;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.brand { display: flex; gap: 0.9rem; align-items: flex-start; margin-bottom: 1.6rem; }
.brand-mark { color: #fbbf24; font-size: 1.9rem; line-height: 1; }
.brand h1 { color: #f8fafc; font-size: 1.35rem; margin: 0 0 0.35rem; }
.brand p { color: #94a3b8; font-size: 0.85rem; margin: 0; }
.tabs { display: flex; gap: 0.4rem; background: #0f1319; border: 1px solid #262c38; border-radius: 10px; padding: 0.3rem; margin-bottom: 1.4rem; }
.tabs button { flex: 1; background: transparent; border: 0; border-radius: 7px; color: #94a3b8; cursor: pointer; padding: 0.55rem; font-weight: 600; }
.tabs button.active { background: #fbbf24; color: #0b0c0e; }
form { display: grid; gap: 0.9rem; }
label { display: grid; gap: 0.35rem; color: #94a3b8; font-size: 0.8rem; }
input { background: #0f1319; border: 1px solid #2f3542; border-radius: 8px; color: #f8fafc; padding: 0.65rem 0.75rem; font-size: 0.92rem; }
input:focus { outline: 2px solid rgba(251, 191, 36, 0.45); border-color: #fbbf24; }
.primary { background: #fbbf24; border: 0; border-radius: 8px; color: #0b0c0e; cursor: pointer; font-weight: 700; padding: 0.75rem; margin-top: 0.3rem; }
.primary:disabled { opacity: 0.65; cursor: wait; }
.divider { display: flex; align-items: center; gap: 0.75rem; color: #64748b; font-size: 0.75rem; margin: 1.2rem 0; }
.divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: #2f3542; }
.github { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.55rem; background: #171b22; border: 1px solid #2f3542; border-radius: 8px; color: #f1f5f9; cursor: pointer; padding: 0.7rem; font-weight: 600; }
.github:hover { border-color: #475569; }
.github-mark { font-size: 1.05rem; }
.error { color: #fca5a5; font-size: 0.82rem; margin: 0; }
.notice { color: #64748b; font-size: 0.75rem; line-height: 1.5; margin: 1.4rem 0 0; text-align: center; }
</style>
