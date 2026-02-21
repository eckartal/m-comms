## Content Platform

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3004](http://localhost:3004) with your browser to see the result.

## Environment Setup

Copy `.env.example` to `.env` and fill required values.

Minimum for app boot:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

Minimum for real OAuth connection flow (X + LinkedIn):
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`

## OAuth Redirect URLs

Configure provider app redirect URLs to:
- `https://<your-domain>/api/platforms/twitter/callback`
- `https://<your-domain>/api/platforms/linkedin/callback`

For local development:
- `http://localhost:3004/api/platforms/twitter/callback`
- `http://localhost:3004/api/platforms/linkedin/callback`

## Go-Live Checklist

1. Set `NEXT_PUBLIC_APP_URL` to your production domain.
2. Set OAuth client ID/secret env vars for platforms you want to connect.
3. Deploy latest `main`.
4. From Integrations page, verify channels show as configurable and connect successfully.
5. Publish a test post to X and LinkedIn from:
- Composer page (`/content/new`)
- Content detail page (Share action)
6. Confirm posts are created on provider side and `content_schedule` rows are recorded.

Run a preflight locally before deploy:

```bash
npm run check:go-live
```

## Notes

- In local sandbox mode, connect uses mock accounts (no real provider posts).
- Real mode requires OAuth credentials; Integrations page now blocks misconfigured providers.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
