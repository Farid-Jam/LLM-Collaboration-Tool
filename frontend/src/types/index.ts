export interface Room {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  display_name: string
  room_id: string
  connected_at: string
}

export interface Message {
  id: string
  room_id: string
  branch_id: string | null
  user_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  parent_message_id: string | null
  display_name?: string
  streaming?: boolean
}

export interface Branch {
  id: string
  room_id: string
  name: string
  forked_from_message_id: string
  created_by: string
  status: 'active' | 'merged' | 'discarded'
  created_at: string
}

export interface QueueItem {
  id: string
  room_id: string
  user_id: string
  content: string
  status: 'pending' | 'approved' | 'discarded' | 'edited'
  created_at: string
}

export interface Document {
  id: string
  room_id: string
  filename: string
  uploaded_by: string
  chunk_count: number
  uploaded_at: string
}

export interface AuthAccount {
  id: string
  email: string
  username: string
  created_at: string
}

export interface RoomWithMemberCount {
  id: string
  name: string
  created_by: string | null
  created_at: string
  member_count: number
}

export interface InvitePreview {
  room_id: string
  room_name: string
  expires_at: string
  is_expired: boolean
}

export interface MergeReview {
  branch_id: string
  branch_name: string
  summary: string
}

export type LLMStatus = 'idle' | 'generating' | `queued(${number})`
