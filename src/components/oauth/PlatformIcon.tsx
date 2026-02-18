'use client'

import { cn } from '@/lib/utils'

// Twitter/X Official SVG Icon (X logo)
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// LinkedIn Official SVG Icon
const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

// Instagram Official SVG Icon (2026 gradient style)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#405DE6" />
        <stop offset="20%" stopColor="#5851DB" />
        <stop offset="40%" stopColor="#833AB4" />
        <stop offset="60%" stopColor="#C13584" />
        <stop offset="80%" stopColor="#E1306C" />
        <stop offset="100%" stopColor="#FD1D1D" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#instagram-gradient)" />
    <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="white" strokeWidth="1.5" />
    <circle cx="17" cy="7" r="1" fill="white" />
  </svg>
)

// Blog/CMS SVG Icon
const BlogIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 14h-3v-3H9v-3h3V6h3v7h3l-4 4z" />
    <path d="M12 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4H6v-2h12v2z" />
  </svg>
)

// TikTok Official SVG Icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.9 6.33-1.72 1.44-4.01 2.08-6.17 1.66-2.64-.52-4.84-2.4-5.7-5.03-.84-2.51-.51-5.22.94-7.49 1.66-2.53 4.37-4.02 7.23-4.02v2.36c-1.43.15-2.76.84-3.75 1.96-1.06 1.18-1.43 2.84-1.03 4.34.38 1.45 1.32 2.7 2.62 3.51 1.34.82 3.01 1.01 4.53.52 1.46-.47 2.68-1.51 3.44-2.87.76-1.36.93-3.05.45-4.57-.46-1.52-1.51-2.82-2.9-3.7-1.42-.9-3.13-1.24-4.74-1.01V.02h.02z" />
  </svg>
)

// YouTube Official SVG Icon
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.376.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.376-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

// Threads Official SVG Icon
const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z" />
  </svg>
)

// Bluesky Official SVG Icon
const BlueskyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2.7 10.8C6.8 8.6 10.3 7.6 14.3 7.1 13.6 5.4 12.2 3.3 10.3 1.8c3.6.6 6.9 2.4 9.6 4.8-.9 3.3-2.3 6.2-4.1 8.5 2.3-.3 4.3-.9 6.1-1.8-2.1 2.9-5 5.2-8.3 6.7C14.8 21.4 11.3 20.4 7.6 18.9c-1.8 2.3-3.8 4.3-6.1 5.7C2.5 23.9 1.2 22.3.2 20.6c3.2-1.7 5.9-4.2 7.8-7.2Z" />
  </svg>
)

// Mastodon Official SVG Icon
const MastodonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.7 9.4l-3.3 1.4c.4 2.2.6 4.5.6 6.9 0 5.2-3.6 7.3-3.6 7.3-4.2 1.4-6.9.8-6.9.8-5.2-.4-7.4-3.2-7.4-3.2-2.2-2.4-2.6-5.9-2.6-5.9-.4-2.6.1-5.1 1.3-7.1-4.8-.7-8.1-4.1-8.1-9.1 0-2.1.4-4.1 1.1-5.9-.5-1.6-1.2-3.2-1.2-3.2 3.8 3.7 9.1 4.5 9.1 4.5 4.2.8 7.9-.7 7.9-.7 2.4-.8 4.8-1.1 7.2-1.1l1.1 2.4c-1.8.2-3.5.6-5.2 1.3 2.2 2.5 3.5 5.7 3.5 9.2Z" />
  </svg>
)

// Facebook Official SVG Icon
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9.198 22h4.004v-8.34h3.184l.492-3.68h-3.676V9.413c0-1.058.06-1.833.164-2.107.686-1.915 2.636-3.135 4.772-3.135 1.311 0 2.623.117 2.623.117v3.594h-1.457c-1.823 0-2.397 1.133-2.397 2.297v1.976h3.661l-.586 3.68h-3.075V22h-4.004v-8.34h-3.184l-.492-3.68h3.676V9.413c0-1.058-.06-1.833-.164-2.107-.686-1.915-2.636-3.135-4.772-3.135-1.311 0-2.623.117-2.623.117v3.594h1.457c1.823 0 2.397 1.133 2.397 2.297v1.976H9.198z" />
  </svg>
)

// Platform icon map
export const platformIcons: Record<string, React.FC<{ className?: string }>> = {
  twitter: TwitterIcon,
  linkedin: LinkedInIcon,
  instagram: InstagramIcon,
  blog: BlogIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  threads: ThreadsIcon,
  bluesky: BlueskyIcon,
  mastodon: MastodonIcon,
  facebook: FacebookIcon,
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = platformIcons[platform] || TwitterIcon
  return <Icon className={cn('h-5 w-5', className)} />
}
