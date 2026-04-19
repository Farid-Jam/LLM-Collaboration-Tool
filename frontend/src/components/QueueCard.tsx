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
    <div className="mx-4 my-2 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-sm shadow-sm">
      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-2">
        Queued prompt — first action wins
      </p>

      {editing ? (
        <textarea
          className="w-full resize-none rounded border border-yellow-400 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-3"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
      ) : (
        <p className="text-gray-800 mb-3 whitespace-pre-wrap">{item.content}</p>
      )}

      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              className="px-3 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
              onClick={submitEdit}
              disabled={!draft.trim()}
            >
              Send edited
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-300 text-gray-700 text-xs hover:bg-gray-400"
              onClick={() => { setEditing(false); setDraft(item.content) }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="px-3 py-1 rounded bg-green-500 text-white text-xs hover:bg-green-600"
              onClick={() => onApprove(roomId, item.id)}
            >
              Send
            </button>
            <button
              className="px-3 py-1 rounded bg-yellow-500 text-white text-xs hover:bg-yellow-600"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="px-3 py-1 rounded bg-red-500 text-white text-xs hover:bg-red-600"
              onClick={() => onDiscard(roomId, item.id)}
            >
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
