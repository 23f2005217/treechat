/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useState } from "react";
import { initializeTheme } from "../store/useThemeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeTheme();
  }, []); // Runs once on mount

  if (!mounted) {
    return <div suppressHydrationWarning style={{ display: 'contents' }} />;
  }

  return <>{children}</>;
}

