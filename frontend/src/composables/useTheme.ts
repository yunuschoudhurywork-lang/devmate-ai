import { ref, computed } from "vue";

export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "devmate_theme";

// Initialize from localStorage if available, defaulting to dark
const initialTheme: Theme = (() => {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  }
  return "dark";
})();

const theme = ref<Theme>(initialTheme);

function applyThemeToDOM(t: Theme): void {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", t);
  if (t === "light") {
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");
  } else {
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");
  }

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(THEME_STORAGE_KEY, t);
  }
}

// Initial application
if (typeof document !== "undefined") {
  applyThemeToDOM(theme.value);
}

export function useTheme() {
  function toggleTheme(): void {
    const nextTheme: Theme = theme.value === "dark" ? "light" : "dark";
    theme.value = nextTheme;
    applyThemeToDOM(nextTheme);
  }

  function setTheme(t: Theme): void {
    theme.value = t;
    applyThemeToDOM(t);
  }

  return {
    theme,
    isDark: computed(() => theme.value === "dark"),
    isLight: computed(() => theme.value === "light"),
    toggleTheme,
    setTheme
  };
}
