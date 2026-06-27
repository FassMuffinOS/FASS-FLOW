import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Per-thread "X is typing…" via Supabase Broadcast — no schema, no
// persistence, just an ephemeral signal between whoever's currently looking
// at the same thread. Each side auto-clears the other's typing flag after a
// few seconds of silence rather than waiting on an explicit "stopped" event,
// so a closed tab or dropped connection can't leave a stale indicator stuck on.
export function useTyping(threadId, userId) {
  const [typingUserIds, setTypingUserIds] = useState(new Set())
  const channelRef = useRef(null)
  const stopTimers = useRef({})

  useEffect(() => {
    if (!threadId) return
    const channel = supabase.channel(`typing-${threadId}`)
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.user_id === userId) return
        setTypingUserIds(prev => new Set(prev).add(payload.user_id))
        clearTimeout(stopTimers.current[payload.user_id])
        stopTimers.current[payload.user_id] = setTimeout(() => {
          setTypingUserIds(prev => {
            const next = new Set(prev)
            next.delete(payload.user_id)
            return next
          })
        }, 3000)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setTypingUserIds(new Set()) // switching threads — clear stale indicator from the previous one
    }
  }, [threadId, userId])

  const sendTyping = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId } })
  }, [userId])

  return { typingUserIds, sendTyping }
}
