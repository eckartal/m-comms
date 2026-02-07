'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  Plus,
  RefreshCw,
  Settings,
  ExternalLink,
} from 'lucide-react'
import { useTeamStore } from '@/stores'

// Mock integrations data
const integrations = [
  {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Post threads, schedule tweets, and track engagement',
    icon: '𝕏',
    connected: true,
    accounts: [
      { id: '1', name: '@company', avatar: null },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Share articles, updates, and company news',
    icon: 'in',
    connected: true,
    accounts: [
      { id: '1', name: 'Company Page', avatar: null },
      { id: '2', name: 'John Doe (Personal)', avatar: null },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Post images, stories, and track visual content',
    icon: '📷',
    connected: false,
    accounts: [],
  },
  {
    id: 'blog',
    name: 'Blog / CMS',
    description: 'Publish to WordPress or other CMS platforms',
    icon: '📝',
    connected: false,
    accounts: [],
  },
]

export default function IntegrationsPage() {
  const currentTeam = useTeamStore((state) => state.currentTeam)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts and publishing platforms
        </p>
      </div>

      {/* Connected Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Connected Platforms</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.filter((i) => i.connected).map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        <Check className="mr-1 h-3 w-3" />
                        Connected
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <div className="space-y-2">
                  {integration.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{account.name}</span>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Account
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Available Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Platforms</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.filter((i) => !i.connected).map((integration) => (
            <Card key={integration.id} className="border-dashed">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                    {integration.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {integration.description}
                </p>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect {integration.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure API keys for advanced integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Twitter API</p>
                  <p className="text-sm text-muted-foreground">
                    Required for posting and scheduling tweets
                  </p>
                </div>
                <Badge variant="outline">Configured</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">LinkedIn API</p>
                  <p className="text-sm text-muted-foreground">
                    Required for posting to LinkedIn
                  </p>
                </div>
                <Badge variant="outline">Configured</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}