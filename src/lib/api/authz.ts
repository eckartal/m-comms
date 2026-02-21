type TeamMembership = {
  role: string
}

export async function requireTeamMembership(
  supabase: unknown,
  userId: string,
  teamId: string,
  roles?: string[]
): Promise<TeamMembership | null> {
  const client = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            in: (column: string, values: string[]) => {
              maybeSingle: () => Promise<{ data: TeamMembership | null; error: { message?: string } | null }>
            }
            maybeSingle: () => Promise<{ data: TeamMembership | null; error: { message?: string } | null }>
          }
        }
      }
    }
  }

  const base = client
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)

  const { data, error } = await (roles && roles.length > 0
    ? base.in('role', roles).maybeSingle()
    : base.maybeSingle())

  if (error) {
    throw new Error(error.message || 'Failed to verify team membership')
  }

  return data
}
