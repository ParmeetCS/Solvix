import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import './theme.css';

const KEY = 'solvix_theme';
const ThemeContext = createContext({ theme: 'dark', setTheme: () => {}, toggle: () => {} });

function readInitial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage unavailable (private mode): fall through
  }
  // First visit: follow the device setting.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    // enable colour transitions only after the first paint
    const id = requestAnimationFrame(() => root.classList.add('theme-ready'));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Sun/moon button. `floating` pins it to the top-right corner of pages that have no header. */
export function ThemeToggle({ floating = false }) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? ' is-floating' : ''}`}
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
