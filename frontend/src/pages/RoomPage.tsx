import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiGet } from '../lib/api'
import { RoomProvider } from '../context/RoomContext'
import { ChatRoom } from '../components/ChatRoom'
import type { RoomWithMemberCount } from '../types'

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { account } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState<RoomWithMemberCount | null>(null)

  useEffect(() => {
    if (!roomId) return
    apiGet<RoomWithMemberCount>(`/rooms/${roomId}`)
      .then(setRoom)
      .catch(() => navigate('/dashboard', { replace: true }))
  }, [roomId, navigate])

  if (!room || !account || !roomId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>Loading…</p>
      </div>
    )
  }

  return (
    <RoomProvider>
      <ChatRoom roomId={roomId} roomName={room.name} displayName={account.username} />
    </RoomProvider>
  )
}
