import { useRoom } from '../context/RoomContext'

export function UserList() {
  const { state } = useRoom()

  return (
    <aside className="w-48 border-l border-gray-200 bg-gray-50 p-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Users</p>
      {state.users.map((u) => (
        <div key={u.id} className="text-sm text-gray-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          {u.display_name}
          {u.id === state.userId && (
            <span className="text-xs text-gray-400">(you)</span>
          )}
        </div>
      ))}
    </aside>
  )
}
