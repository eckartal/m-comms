'use client'

import { useState } from 'react'
import { ArrowLeft, Save, Send, Calendar, Image, Type, List, Quote, Code, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { ContentBlock, Content, PlatformConfig } from '@/types'

interface ContentEditorProps {
  content: Content
  onChange?: (updates: Partial<Content>) => void
  readOnly?: boolean
}

export function ContentEditor({ content, onChange, readOnly = false }: ContentEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(content.blocks || [])
  const [title, setTitle] = useState(content.title || '')
  const [activeTab, setActiveTab] = useState('editor')

  const handleBlocksChange = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks)
    onChange?.({ blocks: newBlocks })
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    onChange?.({ title: newTitle })
  }

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      props: {},
    }
    handleBlocksChange([...blocks, newBlock])
  }

  const updateBlock = (id: string, blockContent: string) => {
    handleBlocksChange(blocks.map((b) => (b.id === id ? { ...b, content: blockContent } : b)))
  }

  const removeBlock = (id: string) => {
    handleBlocksChange(blocks.filter((b) => b.id !== id))
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
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
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
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-medium"
                disabled={readOnly}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="group flex items-start gap-2">
                    <div className="flex items-center gap-1 pt-2 text-muted-foreground">
                      <span className="text-xs font-mono w-4">{index + 1}</span>
                      {getBlockIcon(block.type)}
                    </div>
                    <div className="flex-1">
                      {readOnly ? (
                        <div className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                          {block.content || <span className="text-gray-400 italic">Empty</span>}
                        </div>
                      ) : block.type === 'heading' ? (
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
                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeBlock(block.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => addBlock('text')}>
                      <Type className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock('heading')}>
                      <Type className="h-4 w-4 mr-2" />
                      Heading
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock('bullet_list')}>
                      <List className="h-4 w-4 mr-2" />
                      Bullet List
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock('quote')}>
                      <Quote className="h-4 w-4 mr-2" />
                      Quote
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock('code')}>
                      <Code className="h-4 w-4 mr-2" />
                      Code
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addBlock('image')}>
                      <Image className="h-4 w-4 mr-2" />
                      Image
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(content.platforms || []).map((platform) => (
                <div key={platform.platform} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={platform.enabled}
                      onChange={(e) => {
                        const newPlatforms = (content.platforms || []).map((p) =>
                          p.platform === platform.platform
                            ? { ...p, enabled: e.target.checked }
                            : p
                        )
                        onChange?.({ platforms: newPlatforms })
                      }}
                      disabled={readOnly}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label className="capitalize">{platform.platform}</Label>
                  </div>
                  {platform.enabled && !readOnly && (
                    <Textarea
                      placeholder={`Custom text for ${platform.platform}...`}
                      value={platform.text || ''}
                      onChange={(e) => {
                        const newPlatforms = (content.platforms || []).map((p) =>
                          p.platform === platform.platform
                            ? { ...p, text: e.target.value }
                            : p
                        )
                        onChange?.({ platforms: newPlatforms })
                      }}
                      rows={3}
                      className="flex-1"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}