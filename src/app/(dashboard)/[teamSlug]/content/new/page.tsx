'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { EditorToolbar } from '@/components/editor/EditorToolbar'
import { PublishControls } from '@/components/publish/PublishControls'
import { useAppStore } from '@/stores'
import { Template, PlatformType } from '@/types'
import { Clock, Image, FileText, Sparkles } from 'lucide-react'

// Platform configurations with character limits
const PLATFORMS: Record<PlatformType, { name: string; limit: number; icon: string }> = {
  twitter: { name: 'X (Twitter)', limit: 280, icon: '𝕏' },
  linkedin: { name: 'LinkedIn', limit: 3000, icon: 'in' },
  instagram: { name: 'Instagram', limit: 2200, icon: '📷' },
  blog: { name: 'Blog', limit: 10000, icon: '📝' },
}

// Platform-specific templates
const TEMPLATES: Record<PlatformType, { name: string; content: string }[]> = {
  twitter: [
    { name: 'Announcement', content: '🚀 Big news coming soon! Stay tuned.' },
    { name: 'Tip', content: '💡 Pro tip: ' },
    { name: 'Question', content: 'Quick question for the community: ' },
    { name: 'Thread starter', content: '🧵 Here\'s how we built our latest feature:\n\n1. Start with the problem\n\n2. ' },
  ],
  linkedin: [
    { name: 'Case Study', content: 'How we increased metrics by 200%:\n\nThe challenge:\n\nThe solution:\n\nThe results:\n\n👇 What\'s your experience?' },
    { name: 'Thought Leadership', content: 'Most companies focus on the wrong metrics.\n\nHere\'s why engagement beats reach every time:\n\n[Your insight here]\n\nAgree or disagree?' },
    { name: 'Update', content: 'Excited to share that we\'re launching a new feature! 🚀\n\nWhat it does:\n\nWhy it matters:\n\nLink in comments 👇' },
  ],
  instagram: [
    { name: 'Product Launch', content: '✨ NEW: [Product Name]\n\nFinally here! We\'ve been working on this for [timeframe] and can\'t wait to hear what you think.\n\n#newproduct #[YourBrand]' },
    { name: 'Behind the Scenes', content: 'Behind every post is hours of work. 👀\n\nHere\'s a look at how we create content:\n\n[Your BTS content here]\n\nDouble tap if you love BTS content! ❤️' },
  ],
  blog: [
    { name: 'How-To Guide', content: '## How to [Achieve Result]\n\nIn this guide, you\'ll learn:\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\nLet\'s dive in.\n\n---' },
    { name: 'Announcement', content: '## Big Update: [Title]\n\nWe\'re excited to announce [news].\n\n### What changed\n\n[Details here]\n\n### What this means for you\n\n[Impact]\n\nLet us know what you think!' },
  ],
}

export default function NewContentPage() {
  const router = useRouter()
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentUser, currentTeam } = useAppStore()

  const [content, setContent] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('twitter')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSaved, setIsSaved] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)

  const maxChars = PLATFORMS[selectedPlatform].limit
  const characterCount = content.length
  const isOverLimit = characterCount > maxChars
  const isNearLimit = characterCount > maxChars * 0.8

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`draft_${teamSlug}`)
    if (savedDraft) {
      try {
        const { content: savedContent, platform, bookmarked } = JSON.parse(savedDraft)
        setContent(savedContent || '')
        setSelectedPlatform((platform as PlatformType) || 'twitter')
        setIsBookmarked(bookmarked || false)
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [teamSlug])

  // Auto-save to localStorage
  useEffect(() => {
    if (content || selectedPlatform || isBookmarked) {
      setIsSaved(false)
      const timer = setTimeout(() => {
        localStorage.setItem(`draft_${teamSlug}`, JSON.stringify({
          content,
          platform: selectedPlatform,
          bookmarked: isBookmarked,
          savedAt: new Date().toISOString()
        }))
        setIsSaved(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [content, selectedPlatform, isBookmarked, teamSlug])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handlePublish()
      }
    }

    document.addEventListener('keydown', handleKeyDown as any)
    return () => document.removeEventListener('keydown', handleKeyDown as any)
  }, [content])

  const handlePublish = async () => {
    if (characterCount === 0 || isOverLimit) return
    setIsPublishing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    // Clear draft after successful publish
    localStorage.removeItem(`draft_${teamSlug}`)
    setIsPublishing(false)
    router.push(`/${teamSlug}/content`)
  }

  const handleSchedule = () => {
    console.log('Scheduling:', { content, platform: selectedPlatform })
  }

  const applyTemplate = (templateContent: string) => {
    setContent(templateContent)
    setShowTemplates(false)
  }

  const clearContent = () => {
    setContent('')
    localStorage.removeItem(`draft_${teamSlug}`)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Account Header */}
      <header className="px-12 py-4 border-b border-[#E5E5E7]">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[#1C1C1E]">@{currentUser?.name?.toLowerCase() || 'asimov'}</span>
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            <span className={`text-xs flex items-center gap-1 ${
              isSaved ? 'text-[#8E8E93]' : 'text-[#007AFF]'
            }`}>
              {!isSaved ? (
                <>
                  <span className="w-2 h-2 bg-[#007AFF] rounded-full animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-[#34C759] rounded-full" />
                  Saved
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      {/* Composition Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-12 py-8">
          {/* Platform Selector & Quick Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {Object.entries(PLATFORMS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPlatform(key as PlatformType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all ${
                    selectedPlatform === key
                      ? 'bg-[#1C1C1E] text-white'
                      : 'bg-[#F5F5F7] text-[#6C6C70] hover:bg-[#E5E5E7]'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span className="hidden sm:inline">{config.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#6C6C70] hover:text-[#1C1C1E] transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Templates
              </button>
              {content && (
                <button
                  onClick={clearContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[#6C6C70] hover:text-[#ef4444] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Templates Dropdown */}
          {showTemplates && (
            <div className="mb-6 p-4 bg-[#FAFAFA] rounded-[8px] border border-[#E5E5E7]">
              <p className="text-xs font-medium text-[#8E8E93] mb-3 uppercase tracking-wider">Templates for {PLATFORMS[selectedPlatform].name}</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES[selectedPlatform].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyTemplate(template.content)}
                    className="text-left px-3 py-2 rounded-[6px] hover:bg-[#E5E5E7] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#1C1C1E]">{template.name}</span>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5 line-clamp-1">
                      {template.content.split('\n')[0]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Text Area */}
          <textarea
            placeholder={`What is happening on ${PLATFORMS[selectedPlatform].name}?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[240px] text-[16px] leading-[1.7] bg-transparent border-none outline-none resize-none placeholder:text-[#8E8E93]"
          />

          {/* Editor Toolbar */}
          <EditorToolbar
            characterCount={characterCount}
            maxCharacters={maxChars}
            isBookmarked={isBookmarked}
            onBookmark={() => setIsBookmarked(!isBookmarked)}
          />

          {/* Publish Controls */}
          <PublishControls
            onPublish={handlePublish}
            onSchedule={handleSchedule}
            isPublishing={isPublishing}
            disabled={characterCount === 0 || isOverLimit}
            scheduledDate={null}
          />

          {/* Character/Visual Limit Warning */}
          {content.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className={`text-[12px] tabular-nums ${
                isOverLimit
                  ? 'text-[#ef4444]'
                  : isNearLimit
                  ? 'text-[#F59E0B]'
                  : 'text-[#8E8E93]'
              }`}>
                {characterCount.toLocaleString()} / {maxChars.toLocaleString()} characters
              </span>
              {isOverLimit && (
                <span className="text-[12px] text-[#ef4444]">
                  {characterCount - maxChars} characters over limit
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}