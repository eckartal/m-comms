'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children, defaultTheme = 'dark', storageKey = 'theme' }: { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)

  useEffect(() => {
    // Check for saved theme preference
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    if (storedTheme) {
      setTheme(storedTheme)
    } else {
      // Check system preference if no stored preference
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
      if (prefersLight) {
        setTheme('light')
      }
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const setThemeWithStorage = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme: setThemeWithStorage, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
