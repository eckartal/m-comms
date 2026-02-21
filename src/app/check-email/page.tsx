import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-card-foreground">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to your inbox. Please verify your email, then sign in.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}
