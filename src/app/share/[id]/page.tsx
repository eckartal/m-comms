import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ContentEditor } from '@/components/editor/ContentEditor'
import { CommentList } from '@/components/comments/CommentList'
import type { Content } from '@/types'

interface SharePageProps {
  searchParams: Promise<{ token: string }>
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const { token } = await searchParams
  const supabase = await createClient()

  if (!token) {
    redirect('/login')
  }

  // Get content with share token
  const { data: content, error } = await supabase
    .from('content')
    .select(`
      *,
      createdBy:user_id(id, name, avatar_url)
    `)
    .eq('share_token', token)
    .single()

  if (error || !content) {
    notFound()
  }

  const shareSettings = content.share_settings as { allow_comments?: boolean } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{content.title || 'Untitled'}</h1>
            <p className="text-gray-500 text-sm">
              Shared by {content.createdBy?.name || 'Unknown'}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Read-only view
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <ContentEditor
                content={content as Content}
                readOnly={true}
              />
            </div>
          </div>

          {/* Comments Sidebar */}
          {shareSettings?.allow_comments !== false && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow h-[600px]">
                <CommentList contentId={content.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}