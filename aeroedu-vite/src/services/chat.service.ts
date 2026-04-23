import api from './api'

export interface ChatUser {
  id: string
  name: string | null
  email: string
  image: string | null
  status: 'online' | 'offline' | 'away'
}

export interface ChatMessage {
  id: string
  content: string
  senderId: string
  sender: ChatUser
  roomId: string
  createdAt: string
  read: boolean
}

export interface ChatRoom {
  id: string
  name?: string
  isGroup: boolean
  participants: ChatUser[]
  lastMessage?: ChatMessage
  unreadCount: number
  updatedAt: string
}

export const chatService = {
  getRooms: () =>
    api.get<ChatRoom[]>('/chat/rooms').then((r) => r.data),

  createRoom: (userId: string) =>
    api.post<ChatRoom>('/chat/rooms', { userId }).then((r) => r.data),

  getMessages: (roomId: string, cursor?: string) =>
    api.get<ChatMessage[]>(`/chat/rooms/${roomId}/messages`, { params: { cursor } }).then((r) => r.data),

  sendMessage: (roomId: string, content: string) =>
    api.post<ChatMessage>(`/chat/rooms/${roomId}/messages`, { content }).then((r) => r.data),

  searchUsers: (query: string) =>
    api.get<ChatUser[]>('/chat/users/search', { params: { q: query } }).then((r) => r.data),

  markRead: (roomId: string) =>
    api.post(`/chat/rooms/${roomId}/read`),
}
