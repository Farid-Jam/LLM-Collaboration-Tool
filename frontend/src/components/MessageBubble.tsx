import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '../types'
import { useRoom } from '../context/RoomContext'

interface Props {
  message: Message
  onFork?: (messageId: string, branchName: string) => void
}

export function MessageBubble({ message, onFork }: Props) {
  const { state } = useRoom()
  const isOwn = message.user_id === state.userId
  const isAssistant = message.role === 'assistant'
  const isMain = message.branch_id === null

  const [forking, setForking] = useState(false)
  const [branchName, setBranchName] = useState('')

  const senderLabel = isAssistant ? 'Assistant' : (message.display_name ?? 'Unknown')

  function submitFork() {
    const name = branchName.trim()
    if (!name || !onFork) return
    onFork(message.id, name)
    setForking(false)
    setBranchName('')
  }

  return (
    <div className={`group flex flex-col gap-1 ${isOwn && !isAssistant ? 'items-end' : 'items-start'}`}>
      <span className="text-xs text-gray-400 px-1">{senderLabel}</span>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
          isAssistant
            ? 'bg-purple-50 text-gray-800 border border-purple-200'
            : isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {message.content ? (
          isAssistant ? (
            <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {message.streaming && (
                <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 align-text-bottom animate-pulse" />
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">
              {message.content}
              {message.streaming && (
                <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 align-text-bottom animate-pulse" />
              )}
            </p>
          )
        ) : (
          <span className="flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}
      </div>

      {/* Fork button — only on main branch, non-streaming messages */}
      {isMain && onFork && !message.streaming && message.content && (
        <div className="px-1">
          {forking ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                autoFocus
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitFork()
                  if (e.key === 'Escape') { setForking(false); setBranchName('') }
                }}
                placeholder="Branch name…"
                className="text-xs border border-gray-300 rounded px-2 py-0.5 w-36 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={submitFork}
                className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Fork
              </button>
              <button
                onClick={() => { setForking(false); setBranchName('') }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setForking(true)}
              className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-purple-600 transition-opacity"
              title="Fork branch from here"
            >
              ⎇ fork
            </button>
          )}
        </div>
      )}
    </div>
  )
}
