import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { chatService, ChatRoom, ChatMessage } from '@/services/chat.service'
import io from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import {
  MessageSquare, Search, Send, Users, Circle,
  Plus, X, Loader2, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

// Demo data for when backend is unavailable
const DEMO_ROOMS: ChatRoom[] = [
  {
    id: 'room-1', isGroup: false, unreadCount: 3, updatedAt: new Date(Date.now() - 300000).toISOString(),
    participants: [{ id: 'u2', name: 'Nguyễn Văn An', email: 'an@edu.vn', image: null, status: 'online' }],
    lastMessage: { id: 'm1', content: 'Bạn có thể giải thích bài 3 không?', senderId: 'u2', sender: { id: 'u2', name: 'Nguyễn Văn An', email: '', image: null, status: 'online' }, roomId: 'room-1', createdAt: new Date(Date.now() - 300000).toISOString(), read: false },
  },
  {
    id: 'room-2', isGroup: true, name: 'Nhóm Vật Lý K22', unreadCount: 0, updatedAt: new Date(Date.now() - 3600000).toISOString(),
    participants: [
      { id: 'u3', name: 'Trần Thị Bình', email: '', image: null, status: 'online' },
      { id: 'u4', name: 'Lê Minh Cường', email: '', image: null, status: 'away' },
    ],
    lastMessage: { id: 'm2', content: 'Họp nhóm lúc 7pm nha mọi người 📚', senderId: 'u3', sender: { id: 'u3', name: 'Trần Thị Bình', email: '', image: null, status: 'online' }, roomId: 'room-2', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true },
  },
  {
    id: 'room-3', isGroup: false, unreadCount: 1, updatedAt: new Date(Date.now() - 86400000).toISOString(),
    participants: [{ id: 'u5', name: 'ThS. Nguyễn Văn Khoa', email: '', image: null, status: 'offline' }],
    lastMessage: { id: 'm3', content: 'Kết quả bài kiểm tra đã có trên hệ thống', senderId: 'u5', sender: { id: 'u5', name: 'ThS. Nguyễn Văn Khoa', email: '', image: null, status: 'offline' }, roomId: 'room-3', createdAt: new Date(Date.now() - 86400000).toISOString(), read: false },
  },
]

const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  'room-1': [
    { id: 'm-1', content: 'Chào bạn! Mình đang học bài Động lực học.', senderId: 'u2', sender: { id: 'u2', name: 'Nguyễn Văn An', email: '', image: null, status: 'online' }, roomId: 'room-1', createdAt: new Date(Date.now() - 600000).toISOString(), read: true },
    { id: 'm-2', content: 'Ồ hay đó! Phần nào bạn đang học?', senderId: 'me', sender: { id: 'me', name: 'Bạn', email: '', image: null, status: 'online' }, roomId: 'room-1', createdAt: new Date(Date.now() - 500000).toISOString(), read: true },
    { id: 'm-3', content: 'Bạn có thể giải thích bài 3 không?', senderId: 'u2', sender: { id: 'u2', name: 'Nguyễn Văn An', email: '', image: null, status: 'online' }, roomId: 'room-1', createdAt: new Date(Date.now() - 300000).toISOString(), read: false },
  ],
  'room-2': [
    { id: 'm-4', content: 'Mọi người đã làm bài tập chưa?', senderId: 'u4', sender: { id: 'u4', name: 'Lê Minh Cường', email: '', image: null, status: 'away' }, roomId: 'room-2', createdAt: new Date(Date.now() - 7200000).toISOString(), read: true },
    { id: 'm-5', content: 'Họp nhóm lúc 7pm nha mọi người 📚', senderId: 'u3', sender: { id: 'u3', name: 'Trần Thị Bình', email: '', image: null, status: 'online' }, roomId: 'room-2', createdAt: new Date(Date.now() - 3600000).toISOString(), read: true },
  ],
}

const statusColors = { online: 'text-green-500', offline: 'text-muted-foreground', away: 'text-yellow-500' }

function Avatar({ name, image, status, size = 'md' }: { name?: string | null; image?: string | null; status?: string; size?: 'sm' | 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className="relative shrink-0">
      {image ? (
        <img src={image} alt={name || ''} className={cn(sz, 'rounded-full object-cover')} />
      ) : (
        <div className={cn(sz, 'rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center')}>
          {initials}
        </div>
      )}
      {status && (
        <div className={cn(
          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background',
          status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-yellow-500' : 'bg-muted-foreground'
        )} />
      )}
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeRoomId, setActiveRoomId] = useState<string | null>('room-1')
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>(DEMO_MESSAGES)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch rooms
  const { data: rooms = DEMO_ROOMS, isLoading: roomsLoading } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: chatService.getRooms,
    retry: false,
    initialData: DEMO_ROOMS,
  })

  // Fetch messages for active room
  const { data: apiMessages } = useQuery({
    queryKey: ['chatMessages', activeRoomId],
    queryFn: () => chatService.getMessages(activeRoomId!),
    enabled: !!activeRoomId,
    retry: false,
  })

  // Search users for new chat
  const { data: searchResults = [] } = useQuery({
    queryKey: ['userSearch', userSearchQuery],
    queryFn: () => chatService.searchUsers(userSearchQuery),
    enabled: userSearchQuery.length > 1,
    retry: false,
  })

  // Connect socket
  useEffect(() => {
    const wsUrl = import.meta.env['VITE_WS_URL'] || 'http://localhost:8090'
    const s = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 3,
    })
    s.on('connect', () => setIsConnected(true))
    s.on('disconnect', () => setIsConnected(false))
    s.on('message', (msg: ChatMessage) => {
      setLocalMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }))
    })
    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  // Merge API messages with local
  useEffect(() => {
    if (apiMessages && activeRoomId) {
      setLocalMessages(prev => ({ ...prev, [activeRoomId]: apiMessages }))
    }
  }, [apiMessages, activeRoomId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, activeRoomId])

  const sendMutation = useMutation({
    mutationFn: ({ roomId, content }: { roomId: string; content: string }) =>
      chatService.sendMessage(roomId, content),
    onSuccess: (msg) => {
      setLocalMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }))
    },
    onError: () => {
      // Optimistic: already added to local
    }
  })

  const handleSend = () => {
    if (!inputValue.trim() || !activeRoomId) return
    const content = inputValue.trim()
    setInputValue('')

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      content,
      senderId: user?.id || 'me',
      sender: { id: user?.id || 'me', name: user?.name || 'Bạn', email: '', image: user?.image || null, status: 'online' },
      roomId: activeRoomId,
      createdAt: new Date().toISOString(),
      read: true,
    }
    setLocalMessages(prev => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), optimisticMsg],
    }))

    // Try API, fallback ok since we have optimistic
    sendMutation.mutate({ roomId: activeRoomId, content })
  }

  const activeRoom = rooms.find(r => r.id === activeRoomId)
  const activeMessages = localMessages[activeRoomId || ''] || []
  const filteredRooms = rooms.filter(r => {
    const name = r.isGroup ? r.name : r.participants[0]?.name
    return !searchQuery || name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const getRoomName = (room: ChatRoom) => room.isGroup ? room.name : room.participants[0]?.name || 'Unknown'
  const getRoomParticipant = (room: ChatRoom) => room.participants[0]

  return (
    <div className="h-[calc(100vh-4rem)] flex animate-fade-in overflow-hidden">
      {/* Left sidebar — Room list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col bg-card/30">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Tin nhắn</h2>
            {!isConnected && <span className="text-xs text-muted-foreground">(offline)</span>}
          </div>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {roomsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">Không có cuộc trò chuyện</div>
          ) : (
            filteredRooms.map(room => {
              const participant = getRoomParticipant(room)
              const isActive = room.id === activeRoomId
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/30 transition-colors text-left',
                    isActive && 'bg-primary/5 border-l-2 border-primary'
                  )}
                >
                  {room.isGroup ? (
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-purple-500" />
                    </div>
                  ) : (
                    <Avatar name={participant?.name} image={participant?.image} status={participant?.status} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{getRoomName(room)}</p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-1">
                        {room.lastMessage ? formatRelativeTime(room.lastMessage.createdAt) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate pr-2">{room.lastMessage?.content || ''}</p>
                      {room.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center shrink-0">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right — Chat area */}
      {activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-border bg-card/20 flex items-center gap-3">
            {activeRoom.isGroup ? (
              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-500" />
              </div>
            ) : (
              <Avatar name={getRoomParticipant(activeRoom)?.name} image={getRoomParticipant(activeRoom)?.image} status={getRoomParticipant(activeRoom)?.status} size="sm" />
            )}
            <div>
              <p className="font-semibold text-foreground text-sm">{getRoomName(activeRoom)}</p>
              <p className="text-xs text-muted-foreground">
                {activeRoom.isGroup
                  ? `${activeRoom.participants.length} thành viên`
                  : getRoomParticipant(activeRoom)?.status === 'online' ? '🟢 Đang hoạt động' : '⚫ Ngoại tuyến'
                }
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {activeMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
              </div>
            ) : (
              activeMessages.map((msg, idx) => {
                const isMe = msg.senderId === (user?.id || 'me')
                const showAvatar = !isMe && (idx === 0 || activeMessages[idx - 1]?.senderId !== msg.senderId)
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                    {!isMe && (
                      <div className="w-7 shrink-0">
                        {showAvatar && <Avatar name={msg.sender.name} image={msg.sender.image} size="sm" />}
                      </div>
                    )}
                    <div className={cn('max-w-[65%] space-y-0.5', isMe && 'items-end flex flex-col')}>
                      {showAvatar && !isMe && (
                        <span className="text-xs text-muted-foreground ml-1">{msg.sender.name}</span>
                      )}
                      <div className={cn(
                        'px-3 py-2 rounded-2xl text-sm',
                        isMe
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-card border border-border text-foreground rounded-tl-sm'
                      )}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-muted-foreground px-1">{formatRelativeTime(msg.createdAt)}</span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-border">
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Nhập tin nhắn... (Enter để gửi)"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Chọn một cuộc trò chuyện</p>
          </div>
        </div>
      )}
    </div>
  )
}
