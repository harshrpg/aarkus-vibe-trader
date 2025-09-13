import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      console.log('[auth][hook][use-current-user-image] getSession: start')
      const { data, error } = await createClient().auth.getSession()
      console.log('[auth][hook][use-current-user-image] getSession: result', { hasError: !!error, hasSession: !!data.session })
      if (error) {
        console.error(error)
      }

      setImage(data.session?.user.user_metadata.avatar_url ?? null)
    }
    fetchUserImage()
  }, [])

  return image
}
