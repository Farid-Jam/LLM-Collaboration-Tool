import { useEffect, useRef } from 'react'
import { useRoom } from '../context/RoomContext'
import { useWebSocket } from '../hooks/useWebSocket'
import { Header } from './Header'
import { BranchSidebar } from './BranchSidebar'
import { UserList } from './UserList'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { QueueCard } from './QueueCard'
import { MergeReviewCard } from './MergeReviewCard'

interface Props {
  roomId: string
  roomName: string
  displayName: string
}

export function ChatRoom({ roomId, roomName, displayName }: Props) {
  const { state, dispatch, handleEvent } = useRoom()
  const { emit } = useWebSocket(roomId, displayName, handleEvent)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isStreaming = state.messages.some(m => m.streaming)

  useEffect(() => {
    dispatch({ type: 'SET_ROOM', roomId, roomName, displayName })
  }, [roomId, roomName, displayName, dispatch])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom || isStreaming) {
      el.scrollTop = el.scrollHeight
    }
  }, [state.messages, isStreaming])

  const visibleMessages = (() => {
    if (state.activeBranchId === null) {
      return state.messages.filter(m => m.branch_id === null)
    }
    const branch = state.branches.find(b => b.id === state.activeBranchId)
    const mainMessages = state.messages.filter(m => m.branch_id === null)
    const forkIdx = branch ? mainMessages.findIndex(m => m.id === branch.forked_from_message_id) : -1
    const mainUpToFork = forkIdx >= 0 ? mainMessages.slice(0, forkIdx + 1) : []
    const branchMessages = state.messages.filter(m => m.branch_id === state.activeBranchId)
    return [...mainUpToFork, ...branchMessages]
  })()
  const isGenerating = state.llmStatus !== 'idle'

  function sendMessage(content: string) {
    emit('message:send', { room_id: roomId, branch_id: state.activeBranchId, content })
  }

  function forkBranch(messageId: string, branchName: string) {
    emit('branch:create', { room_id: roomId, fork_from_message_id: messageId, name: branchName })
  }

  function requestMerge(branchId: string) {
    emit('branch:merge', { room_id: roomId, branch_id: branchId })
  }

  function approveMerge(targetRoomId: string, branchId: string) {
    emit('merge:approve', { room_id: targetRoomId, branch_id: branchId })
  }

  function rejectMerge(targetRoomId: string, branchId: string) {
    emit('merge:reject', { room_id: targetRoomId, branch_id: branchId })
  }

  function approveQueue(targetRoomId: string, itemId: string) {
    emit('queue:approve', { room_id: targetRoomId, queue_item_id: itemId })
  }

  function editQueue(targetRoomId: string, itemId: string, newContent: string) {
    emit('queue:edit', { room_id: targetRoomId, queue_item_id: itemId, new_content: newContent })
  }

  function discardQueue(targetRoomId: string, itemId: string) {
    emit('queue:discard', { room_id: targetRoomId, queue_item_id: itemId })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <BranchSidebar roomId={roomId} onMerge={requestMerge} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {visibleMessages.map((m, i) => {
              const prev = visibleMessages[i - 1]
              const prevSameUser = !!(prev && prev.user_id === m.user_id && prev.role === m.role)
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  prevSameUser={prevSameUser}
                  onFork={state.activeBranchId === null ? forkBranch : undefined}
                />
              )
            })}
            <div style={{ height: 1 }} />
          </div>

          {state.mergeReview && (
            <MergeReviewCard
              review={state.mergeReview}
              roomId={roomId}
              onApprove={approveMerge}
              onReject={rejectMerge}
            />
          )}

          {state.reviewItem && (
            <QueueCard
              item={state.reviewItem}
              roomId={roomId}
              onApprove={approveQueue}
              onEdit={editQueue}
              onDiscard={discardQueue}
            />
          )}

          <MessageInput onSend={sendMessage} disabled={isGenerating} />
        </main>
        <UserList />
      </div>
    </div>
  )
}
