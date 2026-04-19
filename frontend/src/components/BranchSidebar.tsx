import { useRoom } from '../context/RoomContext'
import { DocumentPanel } from './DocumentPanel'

interface Props {
  roomId: string
  onMerge: (branchId: string) => void
}

export function BranchSidebar({ roomId, onMerge }: Props) {
  const { state, dispatch } = useRoom()

  return (
    <aside className="w-48 border-r border-gray-200 bg-gray-50 p-3 flex flex-col overflow-y-auto">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Branches</p>
      <button
        className={`text-left text-sm px-2 py-1 rounded ${
          state.activeBranchId === null
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        onClick={() => dispatch({ type: 'SET_ACTIVE_BRANCH', branchId: null })}
      >
        main
      </button>
      {state.branches.map((b) => (
        <div key={b.id} className="flex items-center gap-1 mt-0.5">
          <button
            className={`flex-1 text-left text-sm px-2 py-1 rounded truncate ${
              state.activeBranchId === b.id
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_BRANCH', branchId: b.id })}
            title={b.name}
          >
            {b.name}
          </button>
          <button
            onClick={() => onMerge(b.id)}
            className="shrink-0 text-xs text-purple-500 hover:text-purple-700 px-1"
            title="Merge into main"
          >
            ↩
          </button>
        </div>
      ))}

      <DocumentPanel roomId={roomId} />
    </aside>
  )
}
