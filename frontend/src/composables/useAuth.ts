import { ref, readonly } from "vue";
import { getCurrentUser, logout as logoutApi, getLoginUrl, type User } from "@/services/api";

// Shared state across all component instances
const user = ref<User | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string | null>(null);

let restorePromise: Promise<void> | null = null;

export function useAuth() {
  /**
   * Restore session by checking if user is authenticated
   * Should be called once on app mount
   */
  async function restoreSession(): Promise<void> {
    // Prevent multiple simultaneous restore attempts
    if (restorePromise) {
      return restorePromise;
    }

    restorePromise = (async () => {
      isLoading.value = true;
      error.value = null;

      try {
        const currentUser = await getCurrentUser();
        user.value = currentUser;
      } catch (err) {
        console.error("Failed to restore session:", err);
        error.value = "Failed to restore session";
        user.value = null;
      } finally {
        isLoading.value = false;
      }
    })();

    return restorePromise;
  }

  /**
   * Redirect user to WorkOS login page
   */
  function login(): void {
    window.location.href = getLoginUrl();
  }

  /**
   * Log out the current user
   */
  async function logout(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      await logoutApi();
      user.value = null;
      // Redirect to home after logout
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
      error.value = err instanceof Error ? err.message : "Failed to log out";
      isLoading.value = false;
    }
  }

  /**
   * Check URL for authentication errors
   * Returns error message if present, null otherwise
   */
  function checkAuthError(): string | null {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");

    if (!errorParam) {
      return null;
    }

    // Map error codes to user-friendly messages
    switch (errorParam) {
      case "missing_code":
        return "Authentication failed: missing authorization code";
      case "auth_failed":
        return "Authentication failed: could not verify your credentials";
      case "callback_error":
        return "Authentication failed: an error occurred during login";
      default:
        return "Authentication failed: an unknown error occurred";
    }
  }

  /**
   * Clear authentication error from URL
   */
  function clearAuthError(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
  }

  return {
    // State (readonly to prevent external mutation)
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAuthenticated: readonly(ref(() => user.value !== null)),

    // Methods
    restoreSession,
    login,
    logout,
    checkAuthError,
    clearAuthError,
  };
}
