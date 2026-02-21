'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { useTheme } from '@/components/theme/ThemeProvider'
import { fetchContents, useAppStore, useContentStore, syncTeamsWithStore } from '@/stores'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string | undefined
  const { theme } = useTheme()
  const currentTeam = useAppStore((state) => state.currentTeam)
  const teams = useAppStore((state) => state.teams)
  const setCurrentTeam = useAppStore((state) => state.setCurrentTeam)
  const sidebarExpanded = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    const ensureTeamFromRoute = async () => {
      if (!teamSlug) return

      if (teams.length === 0) {
        await syncTeamsWithStore()
        if (cancelled) return
      }

      const availableTeams = useAppStore.getState().teams
      const matched = availableTeams.find((team) => team.slug === teamSlug)
      if (matched && currentTeam?.id !== matched.id) {
        setCurrentTeam(matched)
      }
      if (!matched && availableTeams.length > 0) {
        setCurrentTeam(availableTeams[0])
        router.replace(`/${availableTeams[0].slug}`)
      }
    }

    ensureTeamFromRoute()

    return () => {
      cancelled = true
    }
  }, [teamSlug, teams.length, currentTeam?.id, setCurrentTeam, router])

  useEffect(() => {
    if (!currentTeam?.id) {
      useContentStore.getState().setContents([])
      useContentStore.getState().setLoadedTeamId(null)
      return
    }

    void fetchContents(currentTeam.id)
  }, [currentTeam?.id])

  return (
    <DashboardShell
      sidebar={
        <Sidebar
          collapsed={!sidebarExpanded}
          onNavigate={() => setMobileSidebarOpen(false)}
        />
      }
      mobileSidebar={<Sidebar onNavigate={() => setMobileSidebarOpen(false)} />}
      header={
        <Header
          sidebarCollapsed={!sidebarExpanded}
          onSidebarToggle={toggleSidebar}
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
        />
      }
      sidebarCollapsed={!sidebarExpanded}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
    >
      {children}
      <Toaster theme={theme} />
    </DashboardShell>
  )
}
