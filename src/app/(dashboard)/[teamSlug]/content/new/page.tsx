'use client'

import { useState, useEffect } from 'react'
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
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ContentBlock, PlatformConfig, ContentStatus } from '@/types'
import { useAppStore } from '@/stores'

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
  const circles = []
  for (let i = 0; i < total; i++) {
    circles.push(
      <span
        key={i}
        className={`inline-block w-2 h-2 rounded-full ${
          i < filled ? 'bg-[#37352f]' : 'bg-[#e5e5e5]'
        }`}
        style={{ marginRight: i < total - 1 ? 3 : 0 }}
      />
    )
  }
  return <span className="inline-flex">{circles}</span>
}

// Block-based content editor component
function BlockEditor({ blocks, onChange, readOnly = false }: { blocks: ContentBlock[]; onChange: (blocks: ContentBlock[]) => void; readOnly?: boolean }) {
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
          {/* Block handle - hover to reveal */}
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
              <Input
                placeholder="Heading..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="border-0 border-b border-[#e5e5e5] rounded-none px-0 py-2 text-lg font-semibold text-[#37352f] placeholder:text-[#c4c4c4] focus:outline-none focus:border-[#2383e2]"
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
                className="border-0 border-l-2 border-[#2383e2] pl-4 rounded-none resize-none text-[#37352f] placeholder:text-[#c4c4c4] focus:outline-none"
              />
            ) : block.type === 'code' ? (
              <Textarea
                placeholder="Code..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="border border-[#e5e5e5] rounded-lg p-3 font-mono text-sm bg-[#f7f7f5] resize-none focus:outline-none focus:border-[#2383e2]"
              />
            ) : block.type === 'divider' ? (
              <Separator />
            ) : (
              <Textarea
                placeholder="Type '/' for commands..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="border-0 rounded-none resize-none px-0 py-2 min-h-[60px] placeholder:text-[#c4c4c4] focus:outline-none"
              />
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

      {/* Block type selector - Notion style */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('text')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Type className="h-4 w-4 mr-1" />
            Text
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('heading')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Type className="h-4 w-4 mr-1" />
            Heading
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('bullet_list')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('quote')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Quote className="h-4 w-4 mr-1" />
            Quote
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('code')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Code className="h-4 w-4 mr-1" />
            Code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('image')}
            className="text-[#9ca3af] hover:text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Image className="h-4 w-4 mr-1" />
            Image
          </Button>
        </div>
      )}
    </div>
  )
}

// Calculate total character count from blocks
function getTotalChars(blocks: ContentBlock[]): number {
  return blocks.reduce((acc, b) => acc + b.content.length, 0)
}

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const { currentUser, currentTeam } = useAppStore()
  const teamSlug = params.teamSlug as string

  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: crypto.randomUUID(), type: 'text', content: '' },
  ])
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([
    { platform: 'twitter', enabled: true, text: '' },
    { platform: 'linkedin', enabled: false, text: '' },
    { platform: 'instagram', enabled: false, text: '' },
  ])
  const [status, setStatus] = useState<ContentStatus>('DRAFT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Platform character counts
  const totalChars = getTotalChars(blocks)

  const handleSave = async (publishStatus: ContentStatus = 'DRAFT') => {
    if (!title.trim() && blocks.every(b => !b.content.trim())) {
      alert('Please add a title or content')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          blocks,
          platforms,
          status: publishStatus,
          scheduled_at: scheduledAt || null,
          team_id: currentTeam?.id,
          created_by: currentUser?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to save content')

      const content = await response.json()
      router.push(`/${teamSlug}/content/${content.id}`)
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Failed to save content. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev =>
      prev.map(p =>
        p.platform === platformId ? { ...p, enabled: !p.enabled } : p
      )
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-6 text-[#9ca3af] hover:text-[#37352f]"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Title */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-3xl font-semibold text-[#37352f] placeholder:text-[#c4c4c4] border-none focus:outline-none bg-transparent"
        />
      </div>

      {/* Editor Canvas */}
      <div className="mb-12">
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </div>

      {/* Inline Platform Panel */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide">
            Platforms
          </h2>
        </div>

        {/* Platform toggles with character count */}
        <div className="space-y-4">
          {platforms.map((platform) => (
            <div key={platform.platform} className="border border-[#e5e5e5] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platform.enabled}
                    onChange={() => togglePlatform(platform.platform)}
                    className="w-4 h-4 rounded border-[#e5e5e5] text-[#2383e2] focus:ring-[#2383e2]"
                  />
                  <span className="font-medium text-[#37352f] capitalize">
                    {platform.platform}
                  </span>
                </label>
                {platform.enabled && (
                  <CharacterCircles
                    current={totalChars}
                    max={PLATFORM_LIMITS[platform.platform as keyof typeof PLATFORM_LIMITS]}
                  />
                )}
              </div>

              {platform.enabled && (
                <div className="ml-7">
                  {/* Auto-generated preview */}
                  <div className="mb-3">
                    <p className="text-xs text-[#9ca3af] mb-2">Preview</p>
                    <div className="bg-[#f7f7f5] rounded-lg p-3 text-sm text-[#37352f]">
                      {title ? (
                        <p>
                          <span className="font-semibold">{title}</span>
                          {blocks[0]?.content && (
                            <> — {blocks[0].content.slice(0, 100)}...</>
                          )}
                        </p>
                      ) : (
                        <span className="text-[#9ca3af] italic">Start writing to see preview...</span>
                      )}
                    </div>
                  </div>

                  {/* Custom text override */}
                  <Textarea
                    placeholder={`Custom text for ${platform.platform}...`}
                    value={platform.text || ''}
                    onChange={(e) =>
                      setPlatforms((prev) =>
                        prev.map((p) =>
                          p.platform === platform.platform
                            ? { ...p, text: e.target.value }
                            : p
                        )
                      )
                    }
                    rows={2}
                    className="resize-none border-[#e5e5e5] focus:border-[#2383e2] focus:ring-[#2383e2]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scheduling Section */}
      <div className="mb-12">
        <h2 className="text-sm font-medium text-[#9ca3af] uppercase tracking-wide mb-4">
          Schedule
        </h2>
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
          </select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-6 border-t border-[#e5e5e5]">
        <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
          {scheduledAt ? (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Scheduled for {new Date(scheduledAt).toLocaleDateString()}
            </span>
          ) : (
            <span>Last saved just now</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            disabled={isSubmitting}
            className="border-[#e5e5e5] text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(status === 'SCHEDULED' ? 'SCHEDULED' : 'IN_REVIEW')}
            disabled={isSubmitting}
            className="bg-[#2383e2] text-white hover:bg-[#1a6fb8]"
          >
            {status === 'SCHEDULED' ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}