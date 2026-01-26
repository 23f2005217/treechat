import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
}

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme: "light" | "dark" | "system") => {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.setAttribute("data-theme", resolvedTheme);
  }
  return resolvedTheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: getSystemTheme(),
      
      setTheme: (theme) => {
        const resolvedTheme = applyTheme(theme);
        set({ theme, resolvedTheme });
      },
      
      toggleTheme: () => {
        const { theme } = get();
        const themes: Theme[] = ["system", "light", "dark"];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        const resolvedTheme = applyTheme(nextTheme);
        set({ theme: nextTheme, resolvedTheme });
      },
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resolvedTheme = applyTheme(state.theme);
        }
      },
    }
  )
);

applyTheme(useThemeStore.getState().theme);

if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      const resolvedTheme = applyTheme("system");
      useThemeStore.setState({ resolvedTheme });
    }
  };
  mediaQuery.addEventListener("change", handleChange);
}
