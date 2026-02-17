'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

type Bookmark = {
  id: number
  user_id: string
  url: string
  title: string
  created_at: string
}

export default function BookmarksPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)

  // 1) Resolve session/user first
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null
      if (!mounted) return
      if (!id) {
        router.replace('/')
        return
      }
      setUserId(id)
    })
    return () => {
      mounted = false
    }
  }, [router, supabase])

  // 2) Initial fetch once userId exists
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error) setBookmarks((data ?? []) as Bookmark[])
      setLoading(false)
    })()
  }, [supabase, userId])

  // 3) Realtime subscription AFTER userId exists (critical for Vercel consistency)
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`bookmarks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const b = payload.new as Bookmark
            setBookmarks((prev) => (prev.some((x) => x.id === b.id) ? prev : [b, ...prev]))
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { id: number }
            setBookmarks((prev) => prev.filter((x) => x.id !== oldRow.id))
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Bookmark
            setBookmarks((prev) => prev.map((x) => (x.id === b.id ? b : x)))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const cleanUrl = url.trim()
    const cleanTitle = title.trim()
    if (!cleanUrl || !cleanTitle) return

    // IMPORTANT: let realtime drive cross-tab updates
    const { error } = await supabase.from('bookmarks').insert({
      user_id: userId,
      url: cleanUrl,
      title: cleanTitle,
    })

    if (!error) {
      setUrl('')
      setTitle('')
    } else {
      console.error(error)
      alert('Failed to add bookmark')
    }
  }

  const deleteBookmark = async (id: number) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Failed to delete')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) return <div>Loading...</div>

  return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Your Bookmarks</h1>
        <p className="text-sm text-slate-300">Private to you. Syncs in real-time.</p>
      </div>

      <button
        onClick={logout}
        className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
      >
        Logout
      </button>
    </div>

    {/* Add form card */}
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <form onSubmit={addBookmark} className="grid gap-3 sm:grid-cols-5 sm:items-end">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Google"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-300">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-white/30"
          />
        </div>

        <button
          type="submit"
          className="sm:col-span-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 active:scale-[0.99]"
        >
          Add
        </button>
      </form>
    </div>

    {/* List card */}
    <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg shadow-black/20 backdrop-blur">
      {bookmarks.length === 0 ? (
        <div className="p-6 text-sm text-slate-300">
          No bookmarks yet. Add one above.
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {bookmarks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">{b.title}</div>
                <a
                  className="block truncate text-sm text-sky-300 hover:text-sky-200 hover:underline"
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {b.url}
                </a>
              </div>

              <button
                onClick={() => deleteBookmark(b.id)}
                className="shrink-0 rounded-xl bg-red-500/15 px-3 py-1.5 text-sm font-medium text-red-200 ring-1 ring-inset ring-red-500/30 hover:bg-red-500/25"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
)

}
