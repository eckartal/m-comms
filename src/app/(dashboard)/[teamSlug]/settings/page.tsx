'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Globe,
  Clock,
  Bell,
  Link as LinkIcon,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/stores'
import { cn } from '@/lib/utils'

const timezones = [
  { id: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5' },
  { id: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6' },
  { id: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7' },
  { id: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8' },
  { id: 'Europe/London', label: 'London (GMT)', offset: 'UTC+0' },
  { id: 'Europe/Paris', label: 'Paris (CET)', offset: 'UTC+1' },
  { id: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'UTC+9' },
]

const workingHours = [
  { id: '09:00-17:00', label: '9 AM - 5 PM' },
  { id: '08:00-16:00', label: '8 AM - 4 PM' },
  { id: '10:00-18:00', label: '10 AM - 6 PM' },
  { id: '12:00-20:00', label: '12 PM - 8 PM' },
]

export default function SettingsPage() {
  const params = useParams()
  const teamSlug = params.teamSlug as string
  const { currentTeam } = useAppStore()
  const [timezone, setTimezone] = useState('America/New_York')
  const [workingHourStart, setWorkingHourStart] = useState('09:00-17:00')
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    scheduled: true,
    published: true,
    mentions: true,
    commentReplies: true,
    statusChanges: true,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load settings from team settings or use defaults
    if (currentTeam?.settings) {
      setTimezone((currentTeam.settings.timezone as string) || 'America/New_York')
    }
  }, [currentTeam?.settings])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-12 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-medium text-foreground">Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Manage your team preferences and integrations
          </p>
        </div>

        {/* Timezone Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Timezone</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <p className="text-[14px] text-muted-foreground mb-4">
              Set your timezone for accurate content scheduling
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {timezones.map((tz) => (
                <button
                  key={tz.id}
                  onClick={() => setTimezone(tz.id)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-[6px] border transition-all',
                    timezone === tz.id
                      ? 'border-foreground bg-accent'
                      : 'border-border hover:border-foreground'
                  )}
                >
                  <div className="text-left">
                    <p className="text-[14px] font-medium text-foreground">{tz.label}</p>
                    <p className="text-[12px] text-muted-foreground">{tz.offset}</p>
                  </div>
                  {timezone === tz.id && (
                    <Check className="w-4 h-4 text-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Working Hours Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Working Hours</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <p className="text-[14px] text-muted-foreground mb-4">
              Set your team&apos;s working hours for scheduling suggestions
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {workingHours.map((hours) => (
                <button
                  key={hours.id}
                  onClick={() => setWorkingHourStart(hours.id)}
                  className={cn(
                    'p-3 rounded-[6px] border text-[14px] font-medium transition-all',
                    workingHourStart === hours.id
                      ? 'border-foreground bg-foreground text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground'
                  )}
                >
                  {hours.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Notifications</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <div className="space-y-4">
              <ToggleOption
                label="Email notifications"
                description="Receive email updates about your content"
                checked={notifications.email}
                onChange={(v) => setNotifications({ ...notifications, email: v })}
              />
              <ToggleOption
                label="Push notifications"
                description="Receive browser push notifications"
                checked={notifications.push}
                onChange={(v) => setNotifications({ ...notifications, push: v })}
              />
              <ToggleOption
                label="Scheduled post reminders"
                description="Get reminded before scheduled posts go live"
                checked={notifications.scheduled}
                onChange={(v) => setNotifications({ ...notifications, scheduled: v })}
              />
              <ToggleOption
                label="Shared notifications"
                description="Get notified when posts are published"
                checked={notifications.published}
                onChange={(v) => setNotifications({ ...notifications, published: v })}
              />
              <ToggleOption
                label="Mentions"
                description="Get notified when someone @mentions you"
                checked={notifications.mentions}
                onChange={(v) => setNotifications({ ...notifications, mentions: v })}
              />
              <ToggleOption
                label="Comment replies"
                description="Get notified when someone replies to your comments"
                checked={notifications.commentReplies}
                onChange={(v) => setNotifications({ ...notifications, commentReplies: v })}
              />
              <ToggleOption
                label="Status changes"
                description="Get notified when content status changes"
                checked={notifications.statusChanges}
                onChange={(v) => setNotifications({ ...notifications, statusChanges: v })}
              />
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-[16px] font-medium text-foreground">Integrations</h2>
          </div>
          <div className="border border-border rounded-[8px] p-4">
            <p className="text-[14px] text-muted-foreground">
              Connect social accounts from the integrations page. Platform status is shown from your real team
              connections.
            </p>
            <Link
              href={`/${teamSlug}/integrations`}
              className="mt-3 inline-flex items-center rounded-[6px] bg-foreground px-3 py-1.5 text-[13px] font-medium text-background hover:bg-hover"
            >
              Open Integrations
            </Link>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-[13px] text-muted-foreground">
            Changes are saved automatically
          </p>
          <button
            onClick={handleSave}
            className={cn(
              'px-6 py-2 rounded-[6px] text-[14px] font-medium transition-all',
              saved
                ? 'bg-emerald-500 text-emerald-500'
                : 'bg-foreground text-foreground hover:bg-hover'
            )}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative',
          checked ? 'bg-foreground' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'left-6' : 'left-1'
          )}
        />
      </button>
    </div>
  )
}
