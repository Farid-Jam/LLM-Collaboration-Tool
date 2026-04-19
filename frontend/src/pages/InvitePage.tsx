import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost } from '../lib/api'
import type { InvitePreview } from '../types'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { account, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  useEffect(() => {
    if (!token) return
    apiGet<InvitePreview>(`/invites/${token}`)
      .then(setPreview)
      .catch(() => setFetchError('Invite link is invalid or does not exist.'))
  }, [token])

  async function accept() {
    if (!account) {
      navigate(`/login?next=/invite/${token}`)
      return
    }
    setAccepting(true)
    setAcceptError('')
    try {
      const data = await apiPost<{ room_id: string }>(`/invites/${token}/accept`)
      navigate(`/room/${data.room_id}`, { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setAcceptError(msg.includes('410') ? 'This invite has expired.' : 'Failed to accept invite.')
      setAccepting(false)
    }
  }

  if (authLoading) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 32, width: 360,
        boxShadow: '0 8px 32px oklch(0% 0 0 / 40%)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {fetchError ? (
          <p style={{ color: 'var(--red)', fontSize: 14 }}>{fetchError}</p>
        ) : !preview ? (
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading invite…</p>
        ) : preview.is_expired ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Invite expired</p>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>This invite link is no longer valid. Ask the room owner for a new one.</p>
          </>
        ) : (
          <>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>
                You've been invited to join
              </p>
              <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{preview.room_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                Expires {new Date(preview.expires_at).toLocaleDateString()}
              </p>
            </div>

            {acceptError && <p style={{ fontSize: 12, color: 'var(--red)' }}>{acceptError}</p>}

            <button
              onClick={accept}
              disabled={accepting}
              style={{
                padding: '10px 0', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: 'white', fontSize: 14,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)',
                opacity: accepting ? 0.6 : 1,
              }}
            >
              {accepting ? 'Joining…' : account ? 'Accept & Join' : 'Sign in to accept'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
