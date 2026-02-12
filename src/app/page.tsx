import Link from 'next/link'
import { ArrowRight, Zap, Users, Share2, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 border border-white/10 flex items-center justify-center bg-white">
              <span className="text-black font-bold">C</span>
            </div>
            <span className="font-medium text-sm uppercase tracking-widest">ContentHub</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/login" className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-medium tracking-wide mb-6">
          Content Collaboration<br />
          <span className="text-white">Made Simple</span>
        </h1>
        <p className="text-sm text-zinc-500 max-w-2xl mx-auto mb-10 tracking-wide uppercase">
          Plan, create, and schedule social content with your team.
          Notion-like editor with real-time collaboration and Typefully-style publishing.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 flex items-center gap-2 transition-colors"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-white/10 text-xs font-medium uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-6 border border-white/10">
            <div className="h-10 w-10 border border-white/10 flex items-center justify-center mb-4">
              <Users className="h-5 w-5 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-2">Collaborate</h3>
            <p className="text-xs text-zinc-500 tracking-wide">
              Comments, mentions, and threaded discussions. Work together on content in real-time.
            </p>
          </div>
          <div className="p-6 border border-white/10">
            <div className="h-10 w-10 border border-white/10 flex items-center justify-center mb-4">
              <Share2 className="h-5 w-5 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-2">Share & Publish</h3>
            <p className="text-xs text-zinc-500 tracking-wide">
              Public links for feedback. One-click publishing to Twitter/X and LinkedIn.
            </p>
          </div>
          <div className="p-6 border border-white/10">
            <div className="h-10 w-10 border border-white/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-5 w-5 text-zinc-400" />
            </div>
            <h3 className="text-sm font-medium uppercase tracking-widest mb-2">Track Performance</h3>
            <p className="text-xs text-zinc-500 tracking-wide">
              Simple analytics to understand how your content performs across platforms.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="border border-white/10 p-8 md:p-16 text-center">
          <Zap className="h-10 w-10 mx-auto mb-6 text-zinc-500" />
          <h2 className="text-xl font-medium uppercase tracking-widest mb-4">Ready to create better content?</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-8 max-w-xl mx-auto">
            Join teams who use ContentHub to collaborate on social content.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-medium uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
          <p>© 2025 ContentHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}