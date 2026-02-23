import { notFound } from 'next/navigation'
import { SharedContentWorkspace } from '@/components/share/SharedContentWorkspace'
import { resolveSharedContent } from '@/lib/shareAccess'
import type { ContentBlock } from '@/types'

interface SharePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { id } = await params
  const { token } = await searchParams

  if (!token) {
    notFound()
  }

  const shared = await resolveSharedContent(id, token)

  if (!shared) {
    notFound()
  }

  const blocks = Array.isArray(shared.content.blocks)
    ? (shared.content.blocks as ContentBlock[])
    : []

  return (
    <SharedContentWorkspace
      contentId={id}
      token={token}
      title={shared.content.title || 'Untitled'}
      blocks={blocks}
      sharedBy={shared.content.createdBy?.name || 'Unknown'}
      allowComments={shared.settings.allowComments}
      allowEditing={shared.settings.allowEditing}
    />
  )
}
