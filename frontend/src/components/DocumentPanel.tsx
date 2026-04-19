import { useState, useEffect, useRef } from 'react'
import { useRoom } from '../context/RoomContext'

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
    fetch(`${API_URL}/rooms/${roomId}/documents`)
      .then((r) => r.json())
      .then((docs) => dispatch({ type: 'LOAD_DOCUMENTS', documents: docs }))
      .catch(() => {})
  }, [roomId, dispatch])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !state.userId) return
    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }

    setError(null)
    setUploading(true)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(
        `${API_URL}/rooms/${roomId}/documents?user_id=${state.userId}`,
        { method: 'POST', body: form },
      )
      if (!res.ok) throw new Error(await res.text())
      // The server emits document:uploaded via Socket.IO, which updates context.
      // No local state update needed.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Documents
      </p>

      {state.documents.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">No documents uploaded.</p>
      ) : (
        <ul className="flex flex-col gap-1 mb-2">
          {state.documents.map((d) => (
            <li key={d.id} className="text-xs text-gray-700 flex items-start gap-1">
              <span className="mt-0.5 text-gray-400">📄</span>
              <span className="truncate" title={d.filename}>
                {d.filename}
                <span className="text-gray-400 ml-1">({d.chunk_count} chunks)</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

      <button
        className="w-full text-xs px-2 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : '+ Upload PDF'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
