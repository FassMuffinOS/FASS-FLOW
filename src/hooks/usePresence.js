import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CHANNEL_NAME = 'presence-online'

// Tracks who's currently connected platform-wide for the green "online" dot
// next to avatars in Messages.jsx and ChatDock.jsx. Supabase Presence is
// purely ephemeral (no schema, no table) — each open tab tracks its own
// userId on mount, and the channel broadcasts the merged presence state to
// every other subscriber, so "online" here means "has a tab open right
// now," same as old Facebook chat's green dot.
export function usePresence(userId) {
  const [onlineIds, setOnlineIds] = useState(new Set())

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(CHANNEL_NAME, { config: { presence: { key: userId } } })

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') channel.track({ online_at: Date.now() })
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return onlineIds
}
