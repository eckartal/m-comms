import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-card-foreground">Could not complete sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The authentication link is invalid or expired. Please try signing in again.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Go to login
          </Link>
          <Link href="/register" className="text-sm text-primary hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
