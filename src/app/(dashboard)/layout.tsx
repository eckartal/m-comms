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
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Sidebar - Navigation & Drafts */}
      <Sidebar />

      {/* Center - Composition Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
        {children}
      </main>

      {/* Right - Preview/Publishing Controls */}
      <aside className="w-80 border-l bg-gray-50/50 hidden xl:flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-medium text-sm text-gray-900">Publishing</h3>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-gray-500">Preview area</p>
        </div>
      </aside>

      <Toaster />
    </div>
  )
}