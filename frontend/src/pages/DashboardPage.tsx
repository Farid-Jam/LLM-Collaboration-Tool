import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost, apiDelete } from '../lib/api'
import { Avatar } from '../components/Avatar'
import type { RoomWithMemberCount } from '../types'

export function DashboardPage() {
  const { account, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<RoomWithMemberCount[]>([])
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    apiGet<RoomWithMemberCount[]>('/rooms').then(setRooms).catch(() => {})
  }, [])

  async function createRoom(e: React.FormEvent) {
    e.preventDefault()
    const name = newRoomName.trim()
    if (!name) return
    setCreateLoading(true)
    try {
      const room = await apiPost<RoomWithMemberCount>('/rooms', { name })
      setRooms(prev => [room, ...prev])
      setNewRoomName('')
      setCreating(false)
    } finally {
      setCreateLoading(false)
    }
  }

  async function deleteRoom(roomId: string) {
    if (!confirm('Delete this room? This cannot be undone.')) return
    try {
      await apiDelete(`/rooms/${roomId}`)
      setRooms(prev => prev.filter(r => r.id !== roomId))
    } catch {}
  }

  async function copyInvite(roomId: string) {
    try {
      const data = await apiPost<{ invite_url: string }>(`/rooms/${roomId}/invites`)
      await navigator.clipboard.writeText(data.invite_url)
      setCopied(roomId)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52, borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>collaborate</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {account && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={account.username} size={24} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{account.username}</span>
            </div>
          )}
          <button onClick={logout} style={ghostBtnStyle}>Log out</button>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Your rooms</h2>
          <button onClick={() => setCreating(true)} style={accentBtnStyle}>+ New room</button>
        </div>

        {/* Create room inline modal */}
        {creating && (
          <form onSubmit={createRoom} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '16px 20px',
            marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <input
              autoFocus
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              placeholder="Room name…"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" disabled={createLoading || !newRoomName.trim()} style={{ ...accentBtnStyle, opacity: createLoading ? 0.6 : 1 }}>
              {createLoading ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => { setCreating(false); setNewRoomName('') }} style={ghostBtnStyle}>
              Cancel
            </button>
          </form>
        )}

        {rooms.length === 0 && !creating ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            color: 'var(--text3)', fontSize: 14,
          }}>
            No rooms yet. Create one to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rooms.map(room => (
              <div key={room.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '14px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{room.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {room.member_count} member{room.member_count !== 1 ? 's' : ''} · {room.id}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => copyInvite(room.id)} style={ghostBtnStyle}>
                    {copied === room.id ? '✓ Copied!' : 'Copy invite link'}
                  </button>
                  <button onClick={() => navigate(`/room/${room.id}`)} style={accentBtnStyle}>
                    Open
                  </button>
                  <button
                    onClick={() => deleteRoom(room.id)}
                    title="Delete room"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border2)',
                      background: 'transparent', color: 'var(--text3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, transition: 'color .15s, border-color .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 3.5 13 3.5" />
                      <path d="M4.5 3.5V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
                      <rect x="2.5" y="3.5" width="9" height="9" rx="1" />
                      <line x1="5.5" y1="6.5" x2="5.5" y2="10" />
                      <line x1="8.5" y1="6.5" x2="8.5" y2="10" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border2)',
  background: 'var(--bg3)', color: 'var(--text)', fontSize: 14,
  fontFamily: 'var(--font)', outline: 'none',
}
const accentBtnStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: 'white', fontSize: 13,
  fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
}
const ghostBtnStyle: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border2)',
  background: 'transparent', color: 'var(--text2)', fontSize: 13,
  cursor: 'pointer', fontFamily: 'var(--font)',
}
