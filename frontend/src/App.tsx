import { useState } from 'react'
import { RoomProvider, useRoom } from './context/RoomContext'
import { ChatRoom } from './components/ChatRoom'

function JoinForm() {
  const { dispatch } = useRoom()
  const [displayName, setDisplayName] = useState('')
  const [roomId, setRoomId] = useState('room-1')
  const [joined, setJoined] = useState(false)
  const [joinedRoomId, setJoinedRoomId] = useState('')
  const [joinedDisplayName, setJoinedDisplayName] = useState('')

  function join() {
    const name = displayName.trim()
    const room = roomId.trim()
    if (!name || !room) return
    // user_id comes from the backend via user:self — just set room + name here
    dispatch({ type: 'SET_ROOM', roomId: room, displayName: name })
    setJoinedRoomId(room)
    setJoinedDisplayName(name)
    setJoined(true)
  }

  if (joined) {
    return <ChatRoom roomId={joinedRoomId} displayName={joinedDisplayName} />
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-xl shadow p-8 flex flex-col gap-4 w-80">
        <h1 className="text-xl font-semibold text-gray-900">Join Chatroom</h1>
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          autoFocus
        />
        <button
          className="bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
          onClick={join}
          disabled={!displayName.trim() || !roomId.trim()}
        >
          Join
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <RoomProvider>
      <JoinForm />
    </RoomProvider>
  )
}
