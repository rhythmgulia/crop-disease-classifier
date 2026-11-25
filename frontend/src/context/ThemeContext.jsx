import React, { createContext, useContext, useLayoutEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  useLayoutEffect(() => {
    localStorage.setItem('agrovision-theme', 'light');
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
