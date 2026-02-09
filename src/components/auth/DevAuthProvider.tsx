'use client'

import { useState, createContext, useContext, ReactNode } from 'react'

// Mock data
export const mockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@example.com',
  name: 'Demo User',
  avatar_url: null,
  created_at: new Date().toISOString(),
}

export const mockTeam = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Demo Team',
  slug: 'demo-team',
  logo: null,
  settings: {},
  created_at: new Date().toISOString(),
}

export const mockTeamMember = {
  id: '00000000-0000-0000-0000-000000000003',
  user_id: mockUser.id,
  team_id: mockTeam.id,
  role: 'OWNER' as const,
  created_at: new Date().toISOString(),
  user: mockUser,
  team: mockTeam,
}

const DevAuthContext = createContext<{
  user: typeof mockUser | null
  team: typeof mockTeam | null
  login: (email?: string) => void
  logout: () => void
  isDevMode: boolean
} | null>(null)

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<typeof mockUser | null>(null)
  const [team, setTeam] = useState<typeof mockTeam | null>(null)

  const login = (email?: string) => {
    setUser({ ...mockUser, email: email || mockUser.email })
    setTeam(mockTeam)
  }

  const logout = () => {
    setUser(null)
    setTeam(null)
  }

  return (
    <DevAuthContext.Provider value={{ user, team, login, logout, isDevMode: true }}>
      {children}
    </DevAuthContext.Provider>
  )
}

export function useDevAuth() {
  return useContext(DevAuthContext)
}