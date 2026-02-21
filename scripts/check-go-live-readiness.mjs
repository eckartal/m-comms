#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve(process.cwd(), '.env')
if (!fs.existsSync(envPath)) {
  console.error('Missing .env file. Copy .env.example and fill values first.')
  process.exit(1)
}

const raw = fs.readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      return [key, value]
    })
)

const requiredBase = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_APP_URL',
]

const requiredPublishNow = [
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
]

const missingBase = requiredBase.filter((key) => !env[key])
const missingPublishNow = requiredPublishNow.filter((key) => !env[key])

const issues = []

if (missingBase.length > 0) {
  issues.push(`Missing base env vars: ${missingBase.join(', ')}`)
}
if (missingPublishNow.length > 0) {
  issues.push(`Missing publish-now OAuth vars: ${missingPublishNow.join(', ')}`)
}

const appUrl = env.NEXT_PUBLIC_APP_URL || ''
if (appUrl && !/^https?:\/\//.test(appUrl)) {
  issues.push('NEXT_PUBLIC_APP_URL must include protocol, e.g. https://app.example.com')
}

if (issues.length > 0) {
  console.error('Go-live readiness check failed:')
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log('Go-live readiness check passed.')
console.log(`App URL: ${appUrl}`)
console.log('Publish-now platforms: X (Twitter), LinkedIn')
