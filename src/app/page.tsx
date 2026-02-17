'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/bookmarks')
      else setLoading(false)
    })
  }, [router, supabase])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Smart Bookmarks</h1>
      <button
        onClick={signInWithGoogle}
        className="rounded bg-black px-4 py-2 text-white"
      >
        Continue with Google
      </button>
    </div>
  )
}
