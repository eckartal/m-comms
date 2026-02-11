'use client'

import { useState } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const [isDevMode] = useState(() => {
    return !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  })

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar className="w-[240px] flex-shrink-0" />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        {children}
      </main>
      <Toaster />
    </div>
  )
}