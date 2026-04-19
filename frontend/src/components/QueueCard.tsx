import { useState } from 'react'
import type { QueueItem } from '../types'

interface Props {
  item: QueueItem
  roomId: string
  onApprove: (roomId: string, itemId: string) => void
  onEdit: (roomId: string, itemId: string, newContent: string) => void
  onDiscard: (roomId: string, itemId: string) => void
}

export function QueueCard({ item, roomId, onApprove, onEdit, onDiscard }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content)

  function submitEdit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onEdit(roomId, item.id, trimmed)
  }

  return (
    <div style={{
      margin: '0 16px 12px', padding: '14px 16px',
      borderRadius: 'var(--radius)',
      border: '1px solid oklch(78% 0.18 70 / 40%)',
      background: 'oklch(14% 0.04 70)',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'oklch(78% 0.18 70)',
        }}>
          Queued prompt — first action wins
        </span>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          autoFocus
          style={{
            width: '100%', resize: 'none', borderRadius: 8,
            border: '1px solid oklch(78% 0.18 70 / 50%)',
            background: 'var(--bg2)', color: 'var(--text)',
            padding: '8px 10px', fontSize: 13, outline: 'none',
            fontFamily: 'var(--font)', marginBottom: 10,
          }}
        />
      ) : (
        <p style={{ color: 'var(--text)', marginBottom: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {item.content}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {editing ? (
          <>
            <Btn color="oklch(65% 0.20 145)" onClick={submitEdit} disabled={!draft.trim()}>Send edited</Btn>
            <Btn ghost onClick={() => { setEditing(false); setDraft(item.content) }}>Cancel</Btn>
          </>
        ) : (
          <>
            <Btn color="oklch(65% 0.20 145)" onClick={() => onApprove(roomId, item.id)}>Send</Btn>
            <Btn color="oklch(70% 0.18 70)" onClick={() => setEditing(true)}>Edit</Btn>
            <Btn color="oklch(60% 0.20 22)" onClick={() => onDiscard(roomId, item.id)}>Discard</Btn>
          </>
        )}
      </div>
    </div>
  )
}

function Btn({ color, ghost, children, onClick, disabled }: {
  color?: string; ghost?: boolean; children: React.ReactNode
  onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 14px', borderRadius: 7,
        border: ghost ? '1px solid var(--border2)' : 'none',
        background: ghost ? 'transparent' : (color ?? 'var(--accent)'),
        color: ghost ? 'var(--text2)' : 'white',
        fontSize: 12, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font)', opacity: disabled ? 0.5 : 1, transition: 'opacity .15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '.75' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = disabled ? '0.5' : '1' }}
    >
      {children}
    </button>
  )
}
