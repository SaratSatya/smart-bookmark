'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase JS automatically handles the OAuth code exchange in-browser.
    // We just redirect after session is established.
    supabase.auth.getSession().then(() => router.replace('/bookmarks'))
  }, [router, supabase])

  return <div>Signing you in...</div>
}
