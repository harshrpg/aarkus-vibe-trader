import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      console.log('[auth][hook][use-current-user-name] getSession: start')
      const { data, error } = await createClient().auth.getSession()
      console.log('[auth][hook][use-current-user-name] getSession: result', { hasError: !!error, hasSession: !!data.session })
      if (error) {
        console.error(error)
      }

      setName(data.session?.user.user_metadata.full_name ?? '?')
    }

    fetchProfileName()
  }, [])

  return name || '?'
}
