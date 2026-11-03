import { useCallback, useEffect, useState } from 'react';

const KEY = 'nexachain.theme';
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Light / dark theme with a persisted override (data-theme on <html>). */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(KEY) || (systemDark() ? 'dark' : 'light');
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
