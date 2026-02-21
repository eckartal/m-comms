'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
import { useAppStore, syncUserWithStore, syncTeamsWithStore } from '@/stores'

export default function RegisterPage() {
  const router = useRouter()
  const { setCurrentUser, setCurrentTeam, setTeams, onboarded, markOnboardingComplete: markOnboardingCompleteStore } = useAppStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'auth' | 'team'>('auth')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) throw error

      if (data.session) {
        // Sync user with store
        await syncUserWithStore()

        if (step === 'auth') {
          // Switch to team creation step
          setStep('team')
          setLoading(false)
          return
        }

        if (step === 'team') {
          if (!teamName.trim()) {
            setError('Team name is required')
            setLoading(false)
            return
          }

          const teamSlug = teamName.toLowerCase().replace(/\s+/g, '-')

          const teamResponse = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: teamName,
              slug: teamSlug,
              createWelcomeContent: true,
            }),
          })

          if (teamResponse.ok) {
            // Sync teams and mark onboarding complete
            await syncTeamsWithStore()
            markOnboardingCompleteStore()

            router.push('/')
            router.refresh()
          } else {
            const errorData = await teamResponse.json()
            setError(errorData.error || errorData?.data?.error || 'Failed to create team')
            setLoading(false)
          }
        }
      } else {
        router.push('/check-email')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign up with Google'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-white/10">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-white/10 bg-white">
            <span className="text-lg font-bold text-black">C</span>
          </div>
          {step === 'auth' ? (
            <>
              <CardTitle className="text-sm uppercase tracking-widest font-medium">Create account</CardTitle>
              <CardDescription className="text-xs text-zinc-500 tracking-wide">
                Start managing your content today
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-sm uppercase tracking-widest font-medium">Create team</CardTitle>
              <CardDescription className="text-xs text-zinc-500 tracking-wide">
                What would you like to call your team?
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-white/5 border border-white/10 p-3 text-sm text-zinc-400">
              {error}
            </div>
          )}

          {step === 'auth' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-widest">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-white/10 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-widest">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-white/10 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="border-white/10 bg-transparent"
                />
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  Must be at least 8 characters
                </p>
              </div>
              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-xs uppercase tracking-widest">Creating...</span>
                  </>
                ) : (
                  <span className="text-xs uppercase tracking-widest">Create Account</span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName" className="text-xs uppercase tracking-widest">Team Name</Label>
                <Input
                  id="teamName"
                  type="text"
                  placeholder="My Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  className="border-white/10 bg-transparent"
                />
              </div>
              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-xs uppercase tracking-widest">Creating...</span>
                  </>
                ) : (
                  <span className="text-xs uppercase tracking-widest">Create Team</span>
                )}
              </Button>
            </form>
          )}

          {step === 'auth' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-zinc-600 tracking-widest">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-white/10 bg-transparent hover:bg-white/5"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#fff"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#a1a1aa"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#71717a"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#52525b"
                  />
                </svg>
                <span className="text-xs uppercase tracking-widest">Google</span>
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          {step === 'auth' ? (
            <p className="text-xs text-zinc-500 tracking-wide">
              Already have an account?{' '}
              <Link href="/login" className="text-white hover:underline uppercase tracking-widest">
                Sign in
              </Link>
            </p>
          ) : (
            <Button variant="ghost" onClick={() => setStep('auth')} className="text-xs text-zinc-500">
              Back
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
