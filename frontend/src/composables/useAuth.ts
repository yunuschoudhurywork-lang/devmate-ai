import { ref, readonly } from "vue";
import {
  getCurrentUser,
  getGithubLoginUrl,
  login as loginApi,
  logout as logoutApi,
  setStoredToken,
  signup as signupApi
} from "@/services/api";
import type { User } from "@/types/analysis";

// Shared state across all component instances
const user = ref<User | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string | null>(null);

let restorePromise: Promise<void> | null = null;

export function useAuth() {
  async function restoreSession(force = false): Promise<void> {
    if (restorePromise && !force) {
      return restorePromise;
    }

    restorePromise = (async () => {
      isLoading.value = true;
      error.value = null;

      try {
        user.value = await getCurrentUser();
      } catch (caught) {
        console.error("Failed to restore session:", caught);
        error.value = "Failed to restore session";
        user.value = null;
      } finally {
        isLoading.value = false;
      }
    })();

    return restorePromise;
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await loginApi({ email, password });
      user.value = result.user;
      return true;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Unable to sign in.";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function signUp(name: string, email: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await signupApi({ name: name || undefined, email, password });
      user.value = result.user;
      return true;
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "Unable to create the account.";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function loginWithGitHub(): void {
    window.location.href = getGithubLoginUrl();
  }

  async function signOut(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      await logoutApi();
    } catch (caught) {
      console.error("Logout failed:", caught);
    } finally {
      user.value = null;
      setStoredToken(null);
      restorePromise = null;
      isLoading.value = false;
      window.location.href = "/";
    }
  }

  function setUser(nextUser: User | null): void {
    user.value = nextUser;
  }

  function checkAuthError(): string | null {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");

    if (!errorParam) return null;

    switch (errorParam) {
      case "missing_code":
        return "GitHub sign-in failed: missing authorization code.";
      case "invalid_state":
        return "GitHub sign-in failed: the security check did not match. Please try again.";
      case "github_not_configured":
        return "GitHub sign-in is not configured on this server.";
      case "auth_failed":
        return "GitHub sign-in failed: could not verify your GitHub account.";
      default:
        return "Authentication failed: an unknown error occurred.";
    }
  }

  function clearAuthError(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("auth");
    window.history.replaceState({}, "", url.toString());
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),

    restoreSession,
    signIn,
    signUp,
    loginWithGitHub,
    signOut,
    setUser,
    checkAuthError,
    clearAuthError
  };
}
