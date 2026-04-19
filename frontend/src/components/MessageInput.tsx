import { useState, useRef, type KeyboardEvent } from 'react'
import { useRoom } from '../context/RoomContext'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled = false }: Props) {
  const { state } = useRoom()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeBranch = state.branches.find(b => b.id === state.activeBranchId)
  const contextName = activeBranch ? activeBranch.name : 'main'
  const canSend = !!value.trim() && !disabled

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  return (
    <div style={{ padding: '12px 20px 16px', background: 'var(--bg)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: 'var(--bg3)', borderRadius: 14, padding: '10px 14px',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border2)'}`,
          transition: 'border-color .2s',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Message ${contextName}… (Enter to send)`}
          rows={1}
          disabled={disabled}
          style={{
            flex: 1, resize: 'none', background: 'transparent', border: 'none',
            outline: 'none', color: 'var(--text)', fontSize: 14,
            fontFamily: 'var(--font)', lineHeight: 1.5,
            maxHeight: 120, overflowY: 'auto',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          style={{
            width: 34, height: 34, borderRadius: 10, border: 'none', flexShrink: 0,
            background: canSend ? 'var(--accent)' : 'var(--bg4)',
            color: canSend ? 'white' : 'var(--text3)',
            cursor: canSend ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .2s', fontSize: 16, fontWeight: 600,
          }}
        >↑</button>
      </div>
      <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', marginTop: 6, opacity: 0.5 }}>
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}
