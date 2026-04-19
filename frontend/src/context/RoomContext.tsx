import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type { Message, Branch, QueueItem, User, LLMStatus, Document, MergeReview } from '../types'

interface RoomState {
  roomId: string | null
  roomName: string | null
  userId: string | null
  displayName: string | null
  users: User[]
  messages: Message[]
  branches: Branch[]
  documents: Document[]
  reviewItem: QueueItem | null
  mergeReview: MergeReview | null
  llmStatus: LLMStatus
  activeBranchId: string | null
}

type Action =
  | { type: 'SET_ROOM'; roomId: string; roomName: string; displayName: string }
  | { type: 'SET_SELF'; userId: string; displayName: string }
  | { type: 'LOAD_USERS'; users: User[] }
  | { type: 'USER_JOINED'; user: User }
  | { type: 'USER_LEFT'; userId: string }
  | { type: 'MESSAGE_NEW'; message: Message }
  | { type: 'MESSAGE_STREAM'; messageId: string; token: string }
  | { type: 'MESSAGE_COMPLETE'; messageId: string }
  | { type: 'LOAD_HISTORY'; messages: Message[] }
  | { type: 'QUEUE_REVIEW'; item: QueueItem }
  | { type: 'QUEUE_RESOLVED' }
  | { type: 'BRANCH_CREATED'; branch: Branch }
  | { type: 'LLM_STATUS'; status: LLMStatus }
  | { type: 'SET_ACTIVE_BRANCH'; branchId: string | null }
  | { type: 'LOAD_DOCUMENTS'; documents: Document[] }
  | { type: 'DOCUMENT_UPLOADED'; document: Document }
  | { type: 'LOAD_BRANCHES'; branches: Branch[] }
  | { type: 'BRANCH_MERGED'; branchId: string }
  | { type: 'MERGE_REVIEW'; review: MergeReview }
  | { type: 'MERGE_RESOLVED' }
  | { type: 'MESSAGE_UPDATE'; messageId: string; content: string }

const initialState: RoomState = {
  roomId: null,
  roomName: null,
  userId: null,
  displayName: null,
  users: [],
  messages: [],
  branches: [],
  documents: [],
  reviewItem: null,
  mergeReview: null,
  llmStatus: 'idle',
  activeBranchId: null,
}

function reducer(state: RoomState, action: Action): RoomState {
  switch (action.type) {
    case 'SET_ROOM':
      return { ...initialState, roomId: action.roomId, roomName: action.roomName, displayName: action.displayName }
    case 'SET_SELF':
      return { ...state, userId: action.userId, displayName: action.displayName, users: [] }
    case 'LOAD_USERS':
      return { ...state, users: action.users }
    case 'USER_JOINED':
      if (state.users.some((u) => u.id === action.user.id)) return state
      return { ...state, users: [...state.users, action.user] }
    case 'USER_LEFT':
      return { ...state, users: state.users.filter((u) => u.id !== action.userId) }
    case 'MESSAGE_NEW':
      if (state.messages.some((m) => m.id === action.message.id)) return state
      return { ...state, messages: [...state.messages, action.message] }
    case 'MESSAGE_STREAM':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, content: m.content + action.token, streaming: true } : m
        ),
      }
    case 'MESSAGE_COMPLETE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, streaming: false } : m
        ),
      }
    case 'LOAD_HISTORY':
      return { ...state, messages: action.messages }
    case 'QUEUE_REVIEW':
      return { ...state, reviewItem: action.item }
    case 'QUEUE_RESOLVED':
      return { ...state, reviewItem: null }
    case 'BRANCH_CREATED':
      return { ...state, branches: [...state.branches, action.branch] }
    case 'LLM_STATUS':
      return { ...state, llmStatus: action.status }
    case 'SET_ACTIVE_BRANCH':
      return { ...state, activeBranchId: action.branchId }
    case 'LOAD_DOCUMENTS':
      return { ...state, documents: action.documents }
    case 'DOCUMENT_UPLOADED':
      if (state.documents.some((d) => d.id === action.document.id)) return state
      return { ...state, documents: [...state.documents, action.document] }
    case 'LOAD_BRANCHES':
      return { ...state, branches: action.branches }
    case 'BRANCH_MERGED':
      return {
        ...state,
        branches: state.branches.filter((b) => b.id !== action.branchId),
        activeBranchId: state.activeBranchId === action.branchId ? null : state.activeBranchId,
        mergeReview: null,
      }
    case 'MERGE_REVIEW':
      return { ...state, mergeReview: action.review }
    case 'MERGE_RESOLVED':
      return { ...state, mergeReview: null }
    case 'MESSAGE_UPDATE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.messageId ? { ...m, content: action.content } : m
        ),
      }
    default:
      return state
  }
}

interface RoomContextValue {
  state: RoomState
  dispatch: React.Dispatch<Action>
  handleEvent: (event: string, data: unknown) => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

export function RoomProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const handleEvent = useCallback((event: string, data: unknown) => {
    const d = data as Record<string, unknown>
    switch (event) {
      case 'user:self':
        dispatch({ type: 'SET_SELF', userId: d.user_id as string, displayName: d.display_name as string })
        break
      case 'room:users':
        dispatch({
          type: 'LOAD_USERS',
          users: (d.users as Array<{ user_id: string; display_name: string }>).map((u) => ({
            id: u.user_id,
            display_name: u.display_name,
            room_id: '',
            connected_at: new Date().toISOString(),
          })),
        })
        break
      case 'user:joined':
        dispatch({
          type: 'USER_JOINED',
          user: {
            id: d.user_id as string,
            display_name: d.display_name as string,
            room_id: '',
            connected_at: new Date().toISOString(),
          },
        })
        break
      case 'user:left':
        dispatch({ type: 'USER_LEFT', userId: d.user_id as string })
        break
      case 'room:history':
        dispatch({ type: 'LOAD_HISTORY', messages: d.messages as Message[] })
        break
      case 'message:new':
        dispatch({ type: 'MESSAGE_NEW', message: d as unknown as Message })
        break
      case 'message:stream':
        dispatch({ type: 'MESSAGE_STREAM', messageId: d.message_id as string, token: d.token as string })
        break
      case 'message:complete':
        dispatch({ type: 'MESSAGE_COMPLETE', messageId: d.message_id as string })
        break
      case 'message:update':
        dispatch({ type: 'MESSAGE_UPDATE', messageId: d.message_id as string, content: d.content as string })
        break
      case 'queue:review':
        dispatch({ type: 'QUEUE_REVIEW', item: d as unknown as QueueItem })
        break
      case 'queue:resolved':
        dispatch({ type: 'QUEUE_RESOLVED' })
        break
      case 'branch:created':
        dispatch({ type: 'BRANCH_CREATED', branch: d as unknown as Branch })
        break
      case 'llm:status':
        dispatch({ type: 'LLM_STATUS', status: d.status as LLMStatus })
        break
      case 'document:uploaded':
        dispatch({ type: 'DOCUMENT_UPLOADED', document: d as unknown as Document })
        break
      case 'room:branches':
        dispatch({ type: 'LOAD_BRANCHES', branches: d.branches as Branch[] })
        break
      case 'branch:merged':
        dispatch({ type: 'BRANCH_MERGED', branchId: d.branch_id as string })
        break
      case 'merge:review':
        dispatch({ type: 'MERGE_REVIEW', review: d as unknown as MergeReview })
        break
      case 'merge:rejected':
        dispatch({ type: 'MERGE_RESOLVED' })
        break
    }
  }, [])

  return (
    <RoomContext.Provider value={{ state, dispatch, handleEvent }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside RoomProvider')
  return ctx
}
