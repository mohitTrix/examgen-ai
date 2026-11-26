import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('examgen.theme') || 'system');
  const [systemDark, setSystemDark] = useState(() => media().matches);
  useEffect(() => {
    const m = media();
    const onChange = (e) => setSystemDark(e.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('examgen.theme', theme);
  }, [theme, dark]);
  return <Ctx.Provider value={{ theme, setTheme, dark }}>{children}</Ctx.Provider>;
}
