import { useState, useEffect, useRef } from 'react'
import { useRoom } from '../context/RoomContext'
import { apiGet } from '../lib/api'

const API_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8080'

interface Props {
  roomId: string
}

export function DocumentPanel({ roomId }: Props) {
  const { state, dispatch } = useRoom()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiGet<import('../types').Document[]>(`/rooms/${roomId}/documents`)
      .then(docs => dispatch({ type: 'LOAD_DOCUMENTS', documents: docs }))
      .catch(() => {})
  }, [roomId, dispatch])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !state.userId) return
    if (!file.name.endsWith('.pdf')) { setError('Only PDF files are supported.'); return }

    setError(null)
    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    const token = localStorage.getItem('jwt')
    try {
      const res = await fetch(
        `${API_URL}/rooms/${roomId}/documents?user_id=${state.userId}`,
        { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text3)',
        padding: '0 4px', marginBottom: 8,
      }}>Documents</p>

      {state.documents.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--text3)', padding: '0 4px', marginBottom: 8 }}>
          No documents uploaded.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
          {state.documents.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>⬡</span>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.3, wordBreak: 'break-all' }} title={d.filename}>
                  {d.filename}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text3)' }}>{d.chunk_count} chunks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ fontSize: 10, color: 'var(--red)', padding: '0 4px', marginBottom: 6 }}>{error}</p>}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%', marginTop: 8, padding: '6px 0',
          borderRadius: 8, border: '1px dashed var(--border2)',
          background: 'transparent', color: 'var(--text3)',
          fontSize: 11, cursor: uploading ? 'default' : 'pointer',
          fontFamily: 'var(--font)', transition: 'all .15s',
          opacity: uploading ? 0.5 : 1,
        }}
        onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' }}
      >
        {uploading ? 'Uploading…' : '+ Upload PDF'}
      </button>
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
