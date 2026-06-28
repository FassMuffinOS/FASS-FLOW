import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Network, Activity, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './BottomNav.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Persistent Messenger-style bottom bar — mounted once in AppShell (mobile
// only, ≤900px, same breakpoint the sidebar drawer already uses) so it
// follows the user across every authenticated page instead of living inside
// a single route. Five fixed destinations rather than the full 20+ item
// sidebar: Home/Messages/Network/Activity/Me map onto existing pages
// (Dashboard, Messages, the FASS Network vendor directory, the new Activity
// feed, and Passport) rather than inventing new ones, except Activity which
// didn't have a page yet.
const ITEMS = [
  { name: 'Home', icon: Home, to: '/dashboard', match: ['/dashboard'] },
  { name: 'Messages', icon: MessageCircle, to: '/messages', match: ['/messages'] },
  { name: 'Network', icon: Network, to: '/network', match: ['/network'] },
  { name: 'Activity', icon: Activity, to: '/activity', match: ['/activity'] },
  { name: 'Me', icon: User, to: '/passport', match: ['/passport'] },
]

export default function BottomNav({ userId }) {
  const location = useLocation()
  const [unread, setUnread] = useState(0)

  // Same totalUnread aggregation ChatDock.jsx already uses against
  // /api/v1/chat/threads/mine — reused here rather than reinvented so the
  // dock badge and this badge never disagree.
  const loadUnread = useCallback(async () => {
    if (!userId || !API_BASE) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/chat/threads/mine?user_id=${userId}`)
      if (res.ok) {
        const threads = (await res.json()).threads || []
        setUnread(threads.reduce((sum, t) => sum + (t.unread_count || 0), 0))
      }
    } catch {
      // non-fatal — badge just stays stale until the next poll/event
    }
  }, [userId])

  useEffect(() => { loadUnread() }, [loadUnread])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('bottomnav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => loadUnread())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, loadUnread])

  return (
    <nav className="bnav" aria-label="Primary">
      {ITEMS.map(item => {
        const active = item.match.some(p => location.pathname.startsWith(p))
        const Icon = item.icon
        return (
          <Link key={item.name} to={item.to} className={`bnav-item ${active ? 'bnav-active' : ''}`}>
            <span className="bnav-icon-wrap">
              <Icon size={21} />
              {item.name === 'Messages' && unread > 0 && (
                <span className="bnav-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </span>
            <span className="bnav-label">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
