import { useRoom } from '../context/RoomContext'

export function Header() {
  const { state } = useRoom()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">Collaborate</h1>
        {state.activeBranchId && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
            branch: {state.activeBranchId.slice(0, 8)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span
          className={`w-2 h-2 rounded-full ${
            state.llmStatus === 'idle' ? 'bg-green-400' : 'bg-yellow-400'
          }`}
        />
        <span>{state.llmStatus}</span>
      </div>
    </header>
  )
}
