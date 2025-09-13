import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  console.log('[auth][get-current-user] getUser: start')
  const { data } = await supabase.auth.getUser()
  console.log('[auth][get-current-user] getUser: result', { hasUser: !!data.user })
  return data.user ?? null
}

export async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user?.id ?? 'anonymous'
}
