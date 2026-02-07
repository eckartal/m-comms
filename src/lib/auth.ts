import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserTeams() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: teamMembers } = await supabase
    .from('team_members')
    .select(`
      role,
      teams (
        id,
        name,
        slug,
        logo
      )
    `)
    .eq('user_id', user.id)

  return teamMembers || []
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function updateUserProfile(updates: { name?: string; avatar_url?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}