import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8080'

export function useWebSocket(
  roomId: string | null,
  displayName: string | null,
  onEvent: (event: string, data: unknown) => void,
) {
  const socketRef = useRef<Socket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!roomId || !displayName) return

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    const events = [
      'user:self',
      'user:joined',
      'user:left',
      'room:history',
      'room:users',
      'message:new',
      'message:stream',
      'message:complete',
      'queue:added',
      'queue:review',
      'queue:resolved',
      'branch:created',
      'branch:merged',
      'merge:review',
      'merge:rejected',
      'room:branches',
      'llm:status',
      'document:uploaded',
    ]

    events.forEach((evt) => {
      socket.on(evt, (data: unknown) => onEventRef.current(evt, data))
    })

    const join = () => socket.emit('user:join', { room_id: roomId, display_name: displayName })

    socket.on('connect', join)
    // Re-join on reconnect as required — new user record each time
    socket.on('reconnect', join)

    return () => { socket.disconnect() }
  }, [roomId, displayName])

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { emit }
}
