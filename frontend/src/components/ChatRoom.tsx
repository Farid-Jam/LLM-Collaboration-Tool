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
  displayName: string
}

export function ChatRoom({ roomId, displayName }: Props) {
  const { state, handleEvent } = useRoom()
  const { emit } = useWebSocket(roomId, displayName, handleEvent)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  const visibleMessages = state.messages.filter(
    (m) => m.branch_id === state.activeBranchId,
  )

  const isGenerating = state.llmStatus !== 'idle'

  function sendMessage(content: string) {
    emit('message:send', { room_id: roomId, branch_id: state.activeBranchId, content })
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

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <BranchSidebar roomId={roomId} onMerge={requestMerge} />
        <main className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {visibleMessages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onFork={state.activeBranchId === null ? forkBranch : undefined}
              />
            ))}
            <div ref={bottomRef} />
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
