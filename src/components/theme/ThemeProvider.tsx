'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeProviderContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children, defaultTheme = 'light', storageKey = 'theme' }: { children: React.ReactNode; defaultTheme?: Theme; storageKey?: string }) {
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
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    // Add light class for light theme, remove it for dark
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
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
