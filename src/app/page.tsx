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
  <div className="mx-auto max-w-md">
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-black/30 backdrop-blur">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Smart Bookmarks</h1>
        <p className="text-sm text-slate-300">
          Save links privately. Sync across tabs in real-time.
        </p>
      </div>

      <button
        onClick={signInWithGoogle}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 active:scale-[0.99]"
      >
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.9 6.1 29.8 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.2-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.9 6.1 29.8 4 24 4c-7.7 0-14.4 3.6-17.7 10.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.4 35.5 26.9 36 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.2 40.4 16.1 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 2.8-3.3 5.1-6 6.5l.1.1 6.3 5.2C38.5 37.1 44 32 44 24c0-1.1-.1-2.2-.4-3.5z" />
        </svg>
        Continue with Google
      </button>

      <p className="mt-4 text-xs text-slate-400">
        OAuth-only. No passwords stored.
      </p>
    </div>
  </div>
)

}
