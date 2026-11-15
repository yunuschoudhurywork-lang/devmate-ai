<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  ApiError,
  changePassword,
  deleteAccount,
  getAuthConfig,
  getGithubLoginUrl,
  updateProfile
} from "@/services/api";
import { useAuth } from "@/composables/useAuth";
import type { AuthConfig } from "@/types/analysis";

const { user, setUser } = useAuth();

const config = ref<AuthConfig | null>(null);
const profile = reactive({ name: user.value?.name ?? "", avatarUrl: user.value?.avatarUrl ?? "" });
const passwordForm = reactive({ currentPassword: "", newPassword: "" });

const profileStatus = ref("");
const passwordStatus = ref("");
const error = ref("");
const savingProfile = ref(false);
const savingPassword = ref(false);

onMounted(async () => {
  try {
    config.value = await getAuthConfig();
  } catch {
    config.value = null;
  }
});

async function saveProfile(): Promise<void> {
  savingProfile.value = true;
  error.value = "";
  profileStatus.value = "";

  try {
    const updated = await updateProfile({
      name: profile.name.trim() || null,
      avatarUrl: profile.avatarUrl.trim() || null
    });
    setUser({ ...user.value!, ...updated });
    profileStatus.value = "Profile updated.";
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to update the profile.";
  } finally {
    savingProfile.value = false;
  }
}

async function savePassword(): Promise<void> {
  savingPassword.value = true;
  error.value = "";
  passwordStatus.value = "";

  if (passwordForm.newPassword.length < 8) {
    error.value = "The new password must be at least 8 characters.";
    savingPassword.value = false;
    return;
  }

  try {
    await changePassword(passwordForm);
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordStatus.value = "Password updated.";
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to update the password.";
  } finally {
    savingPassword.value = false;
  }
}

async function removeAccount(): Promise<void> {
  if (!confirm("Delete your account and all reports, projects and AI artifacts? This cannot be undone.")) return;

  try {
    await deleteAccount();
    window.location.href = "/";
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to delete the account.";
  }
}
</script>

<template>
  <main class="settings">
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section class="panel">
      <header class="panel-header">
        <h2>Profile</h2>
        <span class="muted">{{ user?.email }}</span>
      </header>

      <div class="form-grid">
        <label>Display name <input v-model="profile.name" placeholder="Ada Lovelace" /></label>
        <label>Avatar URL <input v-model="profile.avatarUrl" placeholder="https://…" /></label>
      </div>

      <div class="row">
        <button class="primary" :disabled="savingProfile" @click="saveProfile">
          {{ savingProfile ? "Saving…" : "Save profile" }}
        </button>
        <span v-if="profileStatus" class="success">{{ profileStatus }}</span>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><h2>Password</h2></header>
      <p v-if="user?.provider === 'github' && !user?.hasPassword" class="muted">
        This account signs in with GitHub. Set a password to also sign in with email.
      </p>
      <div class="form-grid">
        <label>
          Current password
          <input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" />
        </label>
        <label>
          New password
          <input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" placeholder="At least 8 characters" />
        </label>
      </div>
      <div class="row">
        <button class="primary" :disabled="savingPassword" @click="savePassword">
          {{ savingPassword ? "Updating…" : "Update password" }}
        </button>
        <span v-if="passwordStatus" class="success">{{ passwordStatus }}</span>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><h2>Connected accounts</h2></header>
      <div class="connection">
        <div>
          <strong>GitHub</strong>
          <p class="muted">
            {{ user?.githubLogin ? `Connected as ${user.githubLogin}` : "Not connected" }}
          </p>
        </div>
        <a v-if="config?.githubEnabled && !user?.githubLogin" class="secondary" :href="getGithubLoginUrl()">Connect GitHub</a>
        <span v-else-if="!config?.githubEnabled" class="muted">GitHub OAuth is not configured on this server.</span>
      </div>
    </section>

    <section class="panel">
      <header class="panel-header"><h2>AI provider</h2></header>
      <p v-if="config?.ai.configured" class="muted">
        Using <strong>{{ config.ai.provider }}</strong> with model <strong>{{ config.ai.model }}</strong>. Keys stay on the backend.
      </p>
      <p v-else class="muted">
        No AI provider is configured. Set <code>OPENAI_API_KEY</code>, <code>AZURE_OPENAI_*</code>,
        <code>ANTHROPIC_API_KEY</code> or <code>GEMINI_API_KEY</code> in the backend <code>.env</code> file.
      </p>
    </section>

    <section class="panel danger-zone">
      <header class="panel-header"><h2>Danger zone</h2></header>
      <p class="muted">Deleting your account removes your reports, projects and AI artifacts permanently.</p>
      <button class="danger" @click="removeAccount">Delete account</button>
    </section>
  </main>
</template>

<style scoped>
.settings { display: grid; gap: 1rem; max-width: 820px; }
.panel { background: rgba(23, 32, 51, 0.85); border: 1px solid #293750; border-radius: 12px; padding: 1.15rem; display: grid; gap: 0.85rem; }
.panel-header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
.panel-header h2 { color: #e2e8f0; font-size: 1rem; margin: 0; }
.muted { color: #94a3b8; font-size: 0.83rem; margin: 0; line-height: 1.55; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.8rem; }
label { display: grid; gap: 0.3rem; color: #94a3b8; font-size: 0.78rem; }
input { background: #0f1729; border: 1px solid #334155; border-radius: 7px; color: #f8fafc; padding: 0.55rem 0.65rem; font-size: 0.86rem; }
input:focus { outline: 2px solid rgba(56, 189, 248, 0.4); border-color: #38bdf8; }
.row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.primary { background: #fbbf24; border: 0; border-radius: 8px; color: #0b0c0e; cursor: pointer; font-weight: 700; padding: 0.6rem 1rem; font-size: 0.85rem; }
.primary:disabled { opacity: 0.65; cursor: wait; }
.secondary { background: transparent; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; cursor: pointer; padding: 0.55rem 0.9rem; font-size: 0.83rem; text-decoration: none; }
.danger { background: transparent; border: 1px solid #7f1d1d; border-radius: 8px; color: #fca5a5; cursor: pointer; padding: 0.6rem 1rem; font-size: 0.85rem; width: fit-content; }
.danger:hover { background: rgba(127, 29, 29, 0.25); }
.danger-zone { border-color: #7f1d1d; }
.connection { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.connection strong { color: #e2e8f0; font-size: 0.88rem; }
.success { color: #86efac; font-size: 0.82rem; }
.error { color: #fca5a5; font-size: 0.85rem; }
code { background: #0f1729; border-radius: 4px; color: #7dd3fc; font-size: 0.78rem; padding: 0.1rem 0.3rem; }
</style>
