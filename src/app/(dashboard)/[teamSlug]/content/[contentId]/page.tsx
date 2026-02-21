'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Send,
  Calendar,
  Image,
  Type,
  List,
  Quote,
  Code,
  Minus,
  X,
  MessageSquare,
  Share2,
  Send as PublishIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ContentBlock, PlatformConfig, ContentStatus, Content } from '@/types'
import { useAppStore } from '@/stores'
import { CommentList } from '@/components/comments/CommentList'
import { InlineComments } from '@/components/comments/InlineComments'
import { ShareModal } from '@/components/share/ShareModal'
import { PublishModal } from '@/components/publish/PublishModal'

// Platform character limits
const PLATFORM_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  blog: 10000,
}

// Circle indicator for character count
function CharacterCircles({ current, max }: { current: number; max: number }) {
  const total = 5
  const filled = Math.min(Math.ceil((current / max) * total), total)
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-[#37352f]' : 'bg-[#e5e5e5]'
          }`}
        />
      ))}
    </span>
  )
}

// Block-based content editor component
function BlockEditor({
  blocks,
  onChange,
  readOnly = false,
  inlineComments,
}: {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  readOnly?: boolean
  inlineComments?: {
    currentUserId: string
    getComments: (blockId: string) => any[]
    onAdd: (blockId: string, text: string, startPos: number, endPos: number, blockText: string) => void
    onResolve: (annotationId: string) => void
    onReply: (annotationId: string, text: string) => void
    onEdit: (commentId: string, text: string) => void
    onDelete: (commentId: string) => void
  }
}) {
  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      props: {},
    }
    onChange([...blocks, newBlock])
  }

  const updateBlock = (id: string, content: string) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)))
  }

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
  }

  const getBlockIcon = (type: ContentBlock['type']) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />
      case 'heading': return <Type className="h-4 w-4" />
      case 'bullet_list': return <List className="h-4 w-4" />
      case 'numbered_list': return <List className="h-4 w-4" />
      case 'image': return <Image className="h-4 w-4" />
      case 'quote': return <Quote className="h-4 w-4" />
      case 'code': return <Code className="h-4 w-4" />
      case 'divider': return <Minus className="h-4 w-4" />
      default: return <Type className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => (
        <div key={block.id} className="group flex items-start gap-2">
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-[#9ca3af] w-4">{index + 1}</span>
            {getBlockIcon(block.type)}
          </div>

          <div className="flex-1">
            {readOnly ? (
              <div className="py-2 px-3 -mx-3 rounded hover:bg-[#f7f7f5]">
                <p className="whitespace-pre-wrap text-[#37352f]">
                  {block.content || <span className="text-[#c4c4c4] italic">Empty</span>}
                </p>
              </div>
            ) : block.type === 'heading' ? (
              <input
                type="text"
                placeholder="Heading..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="w-full border-b border-[#e5e5e5] pb-2 text-lg font-semibold text-[#37352f] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#2383e2] bg-transparent"
              />
            ) : block.type === 'image' ? (
              <div className="border-2 border-dashed border-[#e5e5e5] rounded-lg p-6 text-center hover:bg-[#f7f7f5] cursor-pointer transition-colors">
                <Image className="h-8 w-8 mx-auto text-[#9ca3af] mb-2" />
                <p className="text-sm text-[#9ca3af]">Click to upload image</p>
              </div>
            ) : block.type === 'quote' ? (
              <Textarea
                placeholder="Quote..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="border-l-2 border-[#2383e2] pl-4 resize-none text-[#37352f] placeholder:text-[#c4c4c4] focus:outline-none"
              />
            ) : block.type === 'code' ? (
              <Textarea
                placeholder="Code..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="font-mono text-sm bg-[#f7f7f5] p-3 rounded-lg resize-none text-[#37352f] focus:outline-none focus:border-[#2383e2] border border-[#e5e5e5]"
              />
            ) : block.type === 'divider' ? (
              <Separator />
            ) : (
              <>
                {inlineComments ? (
                  <InlineComments
                    content={block.content || ''}
                    comments={inlineComments.getComments(block.id)}
                    currentUserId={inlineComments.currentUserId}
                    onChangeContent={(value) => updateBlock(block.id, value)}
                    onAddComment={(text, startPos, endPos) =>
                      inlineComments.onAdd(block.id, text, startPos, endPos, block.content || '')
                    }
                    onResolveComment={(id) => inlineComments.onResolve(id)}
                    onReplyComment={(id, text) => inlineComments.onReply(id, text)}
                    onEditComment={(id, text) => inlineComments.onEdit(id, text)}
                    onDeleteComment={(id) => inlineComments.onDelete(id)}
                  />
                ) : (
                  <Textarea
                    placeholder="Type '/' for commands..."
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    className="resize-none px-0 py-2 min-h-[60px] text-[#37352f] placeholder:text-[#c4c4c4] focus:outline-none border-0"
                  />
                )}
              </>
            )}
          </div>

          {!readOnly && (
            <button
              onClick={() => removeBlock(block.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#f7f7f5] transition-opacity mt-2"
            >
              <X className="h-4 w-4 text-[#9ca3af]" />
            </button>
          )}
        </div>
      ))}

      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-4">
          <Button variant="ghost" size="sm" onClick={() => addBlock('text')} className="text-[#9ca3af] hover:text-[#37352f]">
            <Type className="h-4 w-4 mr-1" /> Text
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addBlock('heading')} className="text-[#9ca3af] hover:text-[#37352f]">
            <Type className="h-4 w-4 mr-1" /> Heading
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addBlock('bullet_list')} className="text-[#9ca3af] hover:text-[#37352f]">
            <List className="h-4 w-4 mr-1" /> List
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addBlock('quote')} className="text-[#9ca3af] hover:text-[#37352f]">
            <Quote className="h-4 w-4 mr-1" /> Quote
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addBlock('code')} className="text-[#9ca3af] hover:text-[#37352f]">
            <Code className="h-4 w-4 mr-1" /> Code
          </Button>
          <Button variant="ghost" size="sm" onClick={() => addBlock('image')} className="text-[#9ca3af] hover:text-[#37352f]">
            <Image className="h-4 w-4 mr-1" /> Image
          </Button>
        </div>
      )}
    </div>
  )
}

function getTotalChars(blocks: ContentBlock[]): number {
  return blocks.reduce((acc, b) => acc + b.content.length, 0)
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Shared',
  ARCHIVED: 'Archived',
}

type ActivityItem = {
  id: string
  action: string
  from_status?: string | null
  to_status?: string | null
  from_scheduled_at?: string | null
  to_scheduled_at?: string | null
  from_assigned_to?: string | null
  to_assigned_to?: string | null
  changeNote?: Array<{ reason: string }> | null
  metadata?: Record<string, unknown> | null
  from_version_id?: string | null
  to_version_id?: string | null
  created_at: string
  user?: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  } | null
}

type AnnotationComment = {
  id: string
  text: string
  created_at: string
  user?: {
    id: string
    name: string | null
    email: string
    avatar_url?: string | null
  }
}

type Annotation = {
  id: string
  content_id: string
  block_id: string
  start_offset: number
  end_offset: number
  text_snapshot: string
  status: string
  created_at: string
  created_by: string
  comments: AnnotationComment[]
}
type TeamMemberItem = {
  id: string
  role: string
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url?: string | null
  } | null
}

export default function EditContentPage() {
  const router = useRouter()
  const params = useParams()
  const { currentUser, currentTeam } = useAppStore()
  const teamSlug = params.teamSlug as string
  const contentId = params.contentId as string

  const [content, setContent] = useState<Content | null>(null)
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([])
  const [status, setStatus] = useState<ContentStatus>('DRAFT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [changeReason, setChangeReason] = useState('')
  const [showReasonPrompt, setShowReasonPrompt] = useState(false)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationsLoading, setAnnotationsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([])
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffData, setDiffData] = useState<any>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    if (contentId) {
      fetchContent()
      fetchActivity()
      fetchAnnotations()
    }
  }, [contentId])

  useEffect(() => {
    if (currentTeam?.id) {
      fetchTeamMembers()
    }
  }, [currentTeam?.id])

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${contentId}`)
      if (response.ok) {
        const data = await response.json()
        const contentData = data.data ?? data
        setContent(contentData)
        setTitle(contentData.title || '')
        setBlocks(contentData.blocks || [])
        setPlatforms(contentData.platforms || [])
        setStatus(contentData.status)
        setScheduledAt(contentData.scheduled_at || '')
        setAssignedTo(contentData.assigned_to || null)
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActivity = async () => {
    try {
      setActivityLoading(true)
      const response = await fetch(`/api/content/${contentId}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivity(Array.isArray(data.data) ? data.data : [])
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setActivityLoading(false)
    }
  }

  const fetchAnnotations = async () => {
    try {
      setAnnotationsLoading(true)
      const response = await fetch(`/api/content/${contentId}/annotations`)
      if (response.ok) {
        const data = await response.json()
        setAnnotations(Array.isArray(data.data) ? data.data : [])
      }
    } catch (error) {
      console.error('Error fetching annotations:', error)
    } finally {
      setAnnotationsLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${currentTeam?.id}/members`)
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(Array.isArray(data.data) ? data.data : [])
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleSave = async (publishStatus?: ContentStatus) => {
    setIsSubmitting(true)
    try {
      await fetch(`/api/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          blocks,
          platforms,
          status: publishStatus || status,
          scheduled_at: scheduledAt || null,
          assigned_to: assignedTo || null,
          change_reason: changeReason.trim() || null,
        }),
      })
      if (publishStatus === 'PUBLISHED') {
        router.push(`/${teamSlug}/content`)
      } else {
        await fetchContent()
        await fetchActivity()
        await fetchAnnotations()
        setChangeReason('')
        setShowReasonPrompt(false)
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => prev.map(p => p.platform === platformId ? { ...p, enabled: !p.enabled } : p))
  }

  const totalChars = getTotalChars(blocks)

  const renderActivityLabel = (item: ActivityItem) => {
    if (item.action === 'STATUS_CHANGED') {
      const fromLabel = item.from_status ? statusLabels[item.from_status] || item.from_status : 'Unknown'
      const toLabel = item.to_status ? statusLabels[item.to_status] || item.to_status : 'Unknown'
      return `Status changed: ${fromLabel} → ${toLabel}`
    }
    if (item.action === 'SCHEDULE_UPDATED') {
      const fromDate = item.from_scheduled_at ? new Date(item.from_scheduled_at).toLocaleString() : 'Not set'
      const toDate = item.to_scheduled_at ? new Date(item.to_scheduled_at).toLocaleString() : 'Not set'
      return `Schedule updated: ${fromDate} → ${toDate}`
    }
    if (item.action === 'ASSIGNEE_UPDATED') {
      return 'Assignee updated'
    }
    return item.action.replace(/_/g, ' ').toLowerCase()
  }

  const latestReason = (item: ActivityItem) => item.changeNote?.[0]?.reason || null

  const canShowDiff = (item: ActivityItem) => {
    return item.action === 'CONTENT_UPDATED' && item.metadata?.['diff_available'] && item.from_version_id && item.to_version_id
  }

  const openDiff = async (item: ActivityItem) => {
    if (!item.from_version_id || !item.to_version_id) return
    try {
      setDiffLoading(true)
      setDiffOpen(true)
      const response = await fetch(
        `/api/content/${contentId}/diff?from=${item.from_version_id}&to=${item.to_version_id}`
      )
      if (response.ok) {
        const data = await response.json()
        setDiffData(data.data || null)
      }
    } catch (error) {
      console.error('Error loading diff:', error)
    } finally {
      setDiffLoading(false)
    }
  }

  const diffBlocks = () => {
    const fromBlocks = (diffData?.from?.blocks || []) as ContentBlock[]
    const toBlocks = (diffData?.to?.blocks || []) as ContentBlock[]
    const max = Math.max(fromBlocks.length, toBlocks.length)
    const pairs = []
    for (let i = 0; i < max; i += 1) {
      pairs.push({
        from: fromBlocks[i] || null,
        to: toBlocks[i] || null,
      })
    }
    return pairs
  }

  const buildInlineComments = (blockId: string) => {
    return annotations
      .filter((a) => a.block_id === blockId)
      .map((a) => {
        const root = a.comments?.[0]
        const replies = (a.comments || []).slice(1).map((c) => ({
          id: c.id,
          text: c.text,
          startPos: a.start_offset,
          endPos: a.end_offset,
          user_id: c.user?.id || '',
          created_at: c.created_at,
          user: c.user ? { name: c.user.name, email: c.user.email, avatar_url: c.user.avatar_url || null } : undefined,
          resolved: a.status === 'RESOLVED',
        }))

        return {
          id: root?.id || a.id,
          annotationId: a.id,
          text: root?.text || a.text_snapshot,
          startPos: a.start_offset,
          endPos: a.end_offset,
          user_id: root?.user?.id || a.created_by,
          created_at: root?.created_at || a.created_at,
          user: root?.user ? { name: root.user.name, email: root.user.email, avatar_url: root.user.avatar_url || null } : undefined,
          replies,
          resolved: a.status === 'RESOLVED',
        }
      })
  }

  const addAnnotation = async (
    blockId: string,
    commentText: string,
    startPos: number,
    endPos: number,
    blockText: string
  ) => {
    const snapshot = blockText.slice(startPos, endPos)
    try {
      const response = await fetch(`/api/content/${contentId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_id: blockId,
          start_offset: startPos,
          end_offset: endPos,
          text_snapshot: snapshot,
          comment_text: commentText,
        }),
      })
      if (response.ok) {
        await fetchAnnotations()
      }
    } catch (error) {
      console.error('Error creating annotation:', error)
    }
  }

  const resolveAnnotation = async (annotationId: string) => {
    const current = annotations.find((a) => a.id === annotationId)
    const nextStatus = current?.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    try {
      const response = await fetch(`/api/annotations/${annotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (response.ok) {
        await fetchAnnotations()
      }
    } catch (error) {
      console.error('Error updating annotation:', error)
    }
  }

  const replyAnnotation = async (annotationId: string, text: string) => {
    try {
      const response = await fetch(`/api/annotations/${annotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId, text }),
      })
      if (response.ok) {
        await fetchAnnotations()
      }
    } catch (error) {
      console.error('Error replying to annotation:', error)
    }
  }

  const editAnnotationComment = async (commentId: string, text: string) => {
    try {
      const response = await fetch(`/api/annotation-comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (response.ok) {
        await fetchAnnotations()
      }
    } catch (error) {
      console.error('Error editing annotation comment:', error)
    }
  }

  const deleteAnnotationComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/annotation-comments/${commentId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await fetchAnnotations()
      }
    } catch (error) {
      console.error('Error deleting annotation comment:', error)
    }
  }

  if (isLoading) {
    return <div className="max-w-4xl mx-auto py-8 text-[#9ca3af]">Loading...</div>
  }

  if (!content) {
    return <div className="max-w-4xl mx-auto py-8 text-[#37352f]">Content not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-[#9ca3af] hover:text-[#37352f]">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowComments(true)} className="text-[#9ca3af]">
            <MessageSquare className="h-4 w-4 mr-1" /> Comments
          </Button>
          <ShareModal contentId={contentId} />
          <PublishModal contentId={contentId} />
        </div>
      </div>

      {/* Title */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-3xl font-semibold text-[#37352f] placeholder:text-[#c4c4c4] border-none focus:outline-none bg-transparent"
        />
        <p className="text-sm text-[#9ca3af] mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
          {statusLabels[status]}
          {scheduledAt && (
            <>· Scheduled for {new Date(scheduledAt).toLocaleDateString()}</>
          )}
        </p>
      </div>

      {/* Editor */}
      <div className="mb-12">
        <BlockEditor
          blocks={blocks}
          onChange={setBlocks}
          inlineComments={{
            currentUserId: currentUser?.id || '',
            getComments: (blockId) => buildInlineComments(blockId),
            onAdd: addAnnotation,
            onResolve: resolveAnnotation,
            onReply: replyAnnotation,
            onEdit: editAnnotationComment,
            onDelete: deleteAnnotationComment,
          }}
        />
        {annotationsLoading && (
          <div className="text-xs text-[#9ca3af] mt-2">Loading annotations...</div>
        )}
      </div>

      {/* Platforms */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide mb-4">Platforms</h2>
        <div className="space-y-4">
          {platforms.map((platform) => (
            <div key={platform.platform} className="border border-[#e5e5e5] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platform.enabled}
                    onChange={() => togglePlatform(platform.platform)}
                    className="w-4 h-4 rounded text-[#2383e2]"
                  />
                  <span className="font-medium text-[#37352f] capitalize">{platform.platform}</span>
                </label>
                {platform.enabled && (
                  <CharacterCircles current={totalChars} max={PLATFORM_LIMITS[platform.platform as keyof typeof PLATFORM_LIMITS]} />
                )}
              </div>
              {platform.enabled && (
                <div className="ml-7">
                  <Textarea
                    placeholder={`Custom text for ${platform.platform}...`}
                    value={platform.text || ''}
                    onChange={(e) => setPlatforms(prev => prev.map(p => p.platform === platform.platform ? { ...p, text: e.target.value } : p))}
                    rows={2}
                    className="resize-none border-[#e5e5e5] focus:border-[#2383e2]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide mb-4">Activity</h2>
        {activityLoading ? (
          <div className="text-sm text-[#9ca3af]">Loading activity...</div>
        ) : activity.length === 0 ? (
          <div className="text-sm text-[#9ca3af]">No activity yet</div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className="relative pl-5">
                <div className="absolute left-1 top-2 h-2 w-2 rounded-full bg-[#37352f]" />
                <div className="border-l border-[#e5e5e5] pl-4 py-2">
                  <p className="text-sm text-[#37352f]">{renderActivityLabel(item)}</p>
                  {latestReason(item) && (
                    <p className="text-xs text-[#6b7280] mt-1">Why: {latestReason(item)}</p>
                  )}
                  {canShowDiff(item) && (
                    <button
                      className="text-xs text-[#2383e2] mt-1 hover:underline"
                      onClick={() => openDiff(item)}
                    >
                      View diff
                    </button>
                  )}
                  <p className="text-xs text-[#9ca3af]">
                    {item.user?.name || item.user?.email || 'Unknown user'} · {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ownership */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide mb-4">Owner</h2>
        <div className="max-w-xs">
          <select
            value={assignedTo || ''}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#2383e2] text-[#37352f]"
          >
            <option value="">Unassigned</option>
            {teamMembers
              .filter((member) => member.user?.id)
              .map((member) => (
                <option key={member.id} value={member.user?.id}>
                  {member.user?.full_name || member.user?.email || 'Unknown'}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide mb-4">Schedule</h2>
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowReasonPrompt((prev) => !prev)}
            className="text-xs text-[#6b7280] hover:text-[#37352f]"
          >
            {showReasonPrompt ? 'Hide reason' : 'Add a reason (optional)'}
          </button>
          {showReasonPrompt && (
            <div className="mt-2">
              <input
                type="text"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Why are you making this change?"
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#2383e2] text-[#37352f]"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#2383e2] text-[#37352f]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
            className="px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:border-[#2383e2] text-[#37352f]"
          >
            <option value="DRAFT">Save as Draft</option>
            <option value="IN_REVIEW">Submit for Review</option>
            <option value="SCHEDULED">Schedule</option>
            <option value="PUBLISHED">Share Now</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-[#e5e5e5]">
        <div className="text-sm text-[#9ca3af]">Last saved just now</div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave('DRAFT')} disabled={isSubmitting} className="border-[#e5e5e5] text-[#37352f]">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={() => handleSave(status === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED')} disabled={isSubmitting} className="bg-[#2383e2] text-white hover:bg-[#1a6fb8]">
            <Send className="h-4 w-4 mr-2" />
            {status === 'SCHEDULED' ? 'Schedule' : 'Share'}
          </Button>
        </div>
      </div>

      {/* Comments Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent className="w-[400px] sm:max-w-lg p-0">
          <CommentList contentId={contentId} />
        </SheetContent>
      </Sheet>

      {/* Diff Modal */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Content Diff</DialogTitle>
          </DialogHeader>
          {diffLoading ? (
            <div className="text-sm text-muted-foreground">Loading diff...</div>
          ) : diffData ? (
            <div className="space-y-4">
              {diffBlocks().map((pair, index) => {
                const fromText = typeof pair.from?.content === 'string'
                  ? pair.from?.content
                  : pair.from?.content?.text || ''
                const toText = typeof pair.to?.content === 'string'
                  ? pair.to?.content
                  : pair.to?.content?.text || ''
                const changed = fromText !== toText

                return (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div className={`border rounded p-3 ${changed ? 'border-red-200 bg-red-50/30' : ''}`}>
                      <h4 className="text-[11px] uppercase text-muted-foreground mb-2">Before</h4>
                      <pre className="text-xs whitespace-pre-wrap">{fromText || '—'}</pre>
                    </div>
                    <div className={`border rounded p-3 ${changed ? 'border-green-200 bg-green-50/30' : ''}`}>
                      <h4 className="text-[11px] uppercase text-muted-foreground mb-2">After</h4>
                      <pre className="text-xs whitespace-pre-wrap">{toText || '—'}</pre>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No diff available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
