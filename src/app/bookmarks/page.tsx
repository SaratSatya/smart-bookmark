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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Bookmarks</h1>
        <button onClick={logout} className="rounded border px-3 py-1">
          Logout
        </button>
      </div>

      <form onSubmit={addBookmark} className="space-y-3 rounded border bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded border px-3 py-2"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (https://...)"
          className="w-full rounded border px-3 py-2"
        />
        <button className="rounded bg-black px-4 py-2 text-white">Add</button>
      </form>

      <ul className="space-y-2">
        {bookmarks.length === 0 ? (
          <li className="text-gray-500">No bookmarks yet.</li>
        ) : (
          bookmarks.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded border bg-white p-3">
              <div className="min-w-0">
                <div className="font-medium">{b.title}</div>
                <a className="block truncate text-sm text-blue-600 underline" href={b.url} target="_blank" rel="noreferrer">
                  {b.url}
                </a>
              </div>
              <button
                onClick={() => deleteBookmark(b.id)}
                className="ml-3 rounded bg-red-600 px-3 py-1 text-white"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
