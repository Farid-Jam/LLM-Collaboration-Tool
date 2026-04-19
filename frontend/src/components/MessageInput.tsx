import { useState, type KeyboardEvent } from 'react'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t border-gray-200 bg-white">
      <textarea
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        rows={2}
        placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        onClick={submit}
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </div>
  )
}
