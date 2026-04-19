import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../context/RoomContext'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../lib/api'
import { Avatar } from './Avatar'

export function Header() {
  const { state } = useRoom()
  const { account, logout } = useAuth()
  const navigate = useNavigate()
  const activeBranch = state.branches.find(b => b.id === state.activeBranchId)
  const [copied, setCopied] = useState(false)

  async function copyInvite() {
    if (!state.roomId) return
    try {
      const data = await apiPost<{ invite_url: string }>(`/rooms/${state.roomId}/invites`)
      await navigator.clipboard.writeText(data.invite_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 52, borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => navigate('/dashboard')}
          style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)', cursor: 'pointer' }}
        >
          collaborate
        </div>
        <div style={{ width: 1, height: 16, background: 'var(--border2)' }} />
        <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
          {state.roomName ?? '—'}
        </div>
        {activeBranch && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: 'var(--accent-bg)', border: '1px solid var(--accent)',
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)',
          }}>
            ⎇ {activeBranch.name}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)' }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: state.llmStatus === 'idle' ? 'var(--green)' : 'var(--amber)',
            boxShadow: state.llmStatus !== 'idle' ? '0 0 6px var(--amber)' : 'none',
            transition: 'all .3s',
          }} />
          <span>{state.llmStatus}</span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        <button
          onClick={copyInvite}
          style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 7,
            border: '1px solid var(--border2)', background: 'transparent',
            color: copied ? 'var(--green)' : 'var(--text2)',
            cursor: 'pointer', fontFamily: 'var(--font)', transition: 'color .2s',
          }}
        >
          {copied ? '✓ Copied!' : 'Invite'}
        </button>

        {account && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Avatar name={account.username} size={22} />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{account.username}</span>
            <button
              onClick={logout}
              style={{
                fontSize: 11, color: 'var(--text3)', background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                padding: '2px 4px',
              }}
            >log out</button>
          </div>
        )}
      </div>
    </header>
  )
}
