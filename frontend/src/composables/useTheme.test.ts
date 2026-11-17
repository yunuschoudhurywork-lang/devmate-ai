import { describe, expect, it, beforeEach } from "vitest";
import { useTheme } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.className = "";
  });

  it("toggles between dark and light themes", () => {
    const { theme, isDark, isLight, toggleTheme } = useTheme();

    const initial = theme.value;
    toggleTheme();
    expect(theme.value).not.toBe(initial);

    if (theme.value === "light") {
      expect(isLight.value).toBe(true);
      expect(isDark.value).toBe(false);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      expect(document.body.classList.contains("light-theme")).toBe(true);
    } else {
      expect(isDark.value).toBe(true);
      expect(isLight.value).toBe(false);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.body.classList.contains("dark-theme")).toBe(true);
    }

    toggleTheme();
    expect(theme.value).toBe(initial);
  });
});
