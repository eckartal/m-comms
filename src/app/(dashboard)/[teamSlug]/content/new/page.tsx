'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Send, Calendar, Image, Type, List, Quote, Code, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ContentBlock, PlatformConfig, ContentStatus } from '@/types'
import { useAppStore } from '@/stores'

// Block-based content editor component
function BlockEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (blocks: ContentBlock[]) => void }) {
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

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id)
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]]
      onChange(newBlocks)
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]
      onChange(newBlocks)
    }
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
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div key={block.id} className="group flex items-start gap-2">
          <div className="flex items-center gap-1 pt-2 text-muted-foreground">
            <span className="text-xs font-mono w-4">{index + 1}</span>
            {getBlockIcon(block.type)}
          </div>
          <div className="flex-1">
            {block.type === 'heading' ? (
              <Input
                placeholder="Heading..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="font-bold text-lg"
              />
            ) : block.type === 'image' ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload image</p>
              </div>
            ) : block.type === 'quote' ? (
              <Textarea
                placeholder="Quote..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="border-l-4 border-primary pl-4 font-serif italic"
              />
            ) : block.type === 'code' ? (
              <Textarea
                placeholder="Code..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                className="font-mono text-sm bg-muted"
              />
            ) : block.type === 'divider' ? (
              <Separator />
            ) : (
              <Textarea
                placeholder="Start writing..."
                value={block.content}
                onChange={(e) => updateBlock(block.id, e.target.value)}
                rows={block.type === 'bullet_list' || block.type === 'numbered_list' ? 1 : 3}
              />
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveBlock(block.id, 'up')}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveBlock(block.id, 'down')}
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => removeBlock(block.id)}
            >
              ×
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('text')}
        >
          <Type className="h-4 w-4 mr-2" />
          Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('heading')}
        >
          <Type className="h-4 w-4 mr-2" />
          Heading
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('bullet_list')}
        >
          <List className="h-4 w-4 mr-2" />
          Bullet List
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('quote')}
        >
          <Quote className="h-4 w-4 mr-2" />
          Quote
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('code')}
        >
          <Code className="h-4 w-4 mr-2" />
          Code
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('image')}
        >
          <Image className="h-4 w-4 mr-2" />
          Image
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock('divider')}
        >
          <Minus className="h-4 w-4 mr-2" />
          Divider
        </Button>
      </div>
    </div>
  )
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
  const [activeTab, setActiveTab] = useState('editor')

  const handleSave = async (publishStatus: ContentStatus = 'DRAFT') => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
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

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Content</h1>
        <p className="text-muted-foreground">Craft your content and schedule it across platforms</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Title</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Enter a title for your content..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-medium"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <BlockEditor blocks={blocks} onChange={setBlocks} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {platforms.map((platform) => (
                <div key={platform.platform} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={(e) =>
                        setPlatforms((prev) =>
                          prev.map((p) =>
                            p.platform === platform.platform
                              ? { ...p, enabled: e.target.checked }
                              : p
                          )
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Badge variant="outline" className="capitalize">
                      {platform.platform}
                    </Badge>
                  </div>
                  {platform.enabled && (
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
                      rows={3}
                      className="flex-1"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="schedule">Schedule Publish Date</Label>
                <Input
                  id="schedule"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to save as draft or publish immediately
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Initial Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="IN_REVIEW">Submit for Review</SelectItem>
                    <SelectItem value="SCHEDULED">Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSave('DRAFT')}
          disabled={isSubmitting}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => handleSave(status === 'SCHEDULED' ? 'SCHEDULED' : 'IN_REVIEW')}
          disabled={isSubmitting}
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
  )
}