import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { db } from '@/lib/db'
import { Logger, LogCategory } from '@/lib/logging'
import { useXP } from '@/contexts/XPContext'

interface SocketUser {
  id: string
  name: string
  email: string
  role: string
  schoolId: string
  socketId: string
}

interface ChatRoom {
  id: string
  name: string
  type: 'private' | 'debate'
  participants: SocketUser[]
  status: 'active' | 'inactive' | 'archived'
}

interface DebateSession {
  id: string
  roomId: string
  topic: string
  participant1: SocketUser
  participant2: SocketUser
  status: 'waiting' | 'preparing' | 'active' | 'voting' | 'completed'
  votes: Map<string, { participantId: string; score: number; criteria: any }>
  startTime?: Date
  endTime?: Date
}

class ChatWebSocketServer {
  private io: SocketIOServer
  private users: Map<string, SocketUser> = new Map()
  private rooms: Map<string, ChatRoom> = new Map()
  private debateSessions: Map<string, DebateSession> = new Map()
  private typingUsers: Map<string, Set<string>> = new Map()

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    })

    this.setupEventHandlers()
    this.startCleanupInterval()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      Logger.info('User connected', LogCategory.SYSTEM, {
        metadata: {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        }
      })

      // User authentication
      socket.on('authenticate', async (data: { userId: string; schoolId: string }) => {
        try {
          const user = await db.user.findFirst({
            where: {
              id: data.userId,
              schoolId: data.schoolId
            }
          })

          if (!user) {
            socket.emit('auth_error', { message: 'User not found' })
            return
          }

          const socketUser: SocketUser = {
            id: user.id,
            name: user.name || 'Unknown',
            email: user.email,
            role: user.role,
            schoolId: data.schoolId,
            socketId: socket.id
          }

          this.users.set(socket.id, socketUser)
          socket.emit('authenticated', { user: socketUser })

          Logger.info('User authenticated', LogCategory.AUTH, {
            metadata: {
              userId: user.id,
              socketId: socket.id
            }
          })
        } catch (error) {
          Logger.error('Authentication failed', LogCategory.AUTH, {
            metadata: {
              socketId: socket.id,
              error: (error as Error).message
            }
          }, error as Error)
          socket.emit('auth_error', { message: 'Authentication failed' })
        }
      })

      // Join room
      socket.on('join_room', async (data: { roomId: string }) => {
        try {
          const user = this.users.get(socket.id)
          if (!user) {
            socket.emit('error', { message: 'Not authenticated' })
            return
          }

          const room = await this.getOrCreateRoom(data.roomId, user.schoolId)
          if (!room) {
            socket.emit('error', { message: 'Room not found' })
            return
          }

          // Check if user can join this room
          const canJoin = await this.canUserJoinRoom(user.id, data.roomId)
          if (!canJoin) {
            socket.emit('error', { message: 'Cannot join this room' })
            return
          }

          socket.join(data.roomId)
          this.addUserToRoom(data.roomId, user)

          socket.emit('room_joined', { room })
          socket.to(data.roomId).emit('user_joined', { user })

          Logger.info('User joined room', LogCategory.SYSTEM, {
            metadata: {
              userId: user.id,
              roomId: data.roomId
            }
          })
        } catch (error) {
          Logger.error('Failed to join room', LogCategory.SYSTEM, {
            metadata: {
              socketId: socket.id,
              roomId: data.roomId,
              error: (error as Error).message
            }
          }, error as Error)
          socket.emit('error', { message: 'Failed to join room' })
        }
      })

      // Leave room
      socket.on('leave_room', (data: { roomId: string }) => {
        const user = this.users.get(socket.id)
        if (!user) return

        socket.leave(data.roomId)
        this.removeUserFromRoom(data.roomId, user.id)
        socket.to(data.roomId).emit('user_left', { user })

        Logger.info('User left room', LogCategory.SYSTEM, {
          metadata: {
            userId: user.id,
            roomId: data.roomId
          }
        })
      })

      // Send message
      socket.on('send_message', async (data: { roomId: string; content: string; type?: string }) => {
        try {
          const user = this.users.get(socket.id)
          if (!user) {
            socket.emit('error', { message: 'Not authenticated' })
            return
          }

          const message = await this.saveMessage({
            roomId: data.roomId,
            senderId: user.id,
            content: data.content,
            type: data.type || 'text'
          })

          this.io.to(data.roomId).emit('new_message', {
            message,
            user
          })

          Logger.info('Message sent', LogCategory.SYSTEM, {
            metadata: {
              userId: user.id,
              roomId: data.roomId,
              messageId: message.id
            }
          })
        } catch (error) {
          Logger.error('Failed to send message', LogCategory.SYSTEM, {
            metadata: {
              socketId: socket.id,
              roomId: data.roomId,
              error: (error as Error).message
            }
          }, error as Error)
          socket.emit('error', { message: 'Failed to send message' })
        }
      })

      // Typing indicator
      socket.on('typing_start', (data: { roomId: string }) => {
        const user = this.users.get(socket.id)
        if (!user) return

        this.setTypingStatus(data.roomId, user.id, true)
        socket.to(data.roomId).emit('user_typing', {
          userId: user.id,
          userName: user.name,
          isTyping: true
        })
      })

      socket.on('typing_stop', (data: { roomId: string }) => {
        const user = this.users.get(socket.id)
        if (!user) return

        this.setTypingStatus(data.roomId, user.id, false)
        socket.to(data.roomId).emit('user_typing', {
          userId: user.id,
          userName: user.name,
          isTyping: false
        })
      })

      // Debate system
      socket.on('start_debate', async (data: { roomId: string; topic: string; participant2Id: string }) => {
        try {
          const user = this.users.get(socket.id)
          if (!user) return

          const debateSession = await this.createDebateSession({
            roomId: data.roomId,
            topic: data.topic,
            participant1Id: user.id,
            participant2Id: data.participant2Id
          })

          this.io.to(data.roomId).emit('debate_started', {
            session: debateSession,
            topic: data.topic
          })

          // Start preparation phase
          setTimeout(() => {
            this.startDebatePhase(debateSession.id)
          }, 30000) // 30 seconds preparation

        } catch (error) {
          Logger.error('Failed to start debate', LogCategory.SYSTEM, {
            metadata: {
              socketId: socket.id,
              roomId: data.roomId,
              error: (error as Error).message
            }
          }, error as Error)
          socket.emit('error', { message: 'Failed to start debate' })
        }
      })

      // Vote on debate
      socket.on('vote_debate', async (data: { sessionId: string; participantId: string; score: number; criteria: any }) => {
        try {
          const user = this.users.get(socket.id)
          if (!user) return

          const vote = await this.saveDebateVote({
            sessionId: data.sessionId,
            voterId: user.id,
            participantId: data.participantId,
            score: data.score,
            criteria: data.criteria
          })

          this.io.to(data.sessionId).emit('debate_vote', {
            vote,
            voter: user
          })

        } catch (error) {
          Logger.error('Failed to vote on debate', LogCategory.SYSTEM, {
            metadata: {
              socketId: socket.id,
              sessionId: data.sessionId,
              error: (error as Error).message
            }
          }, error as Error)
          socket.emit('error', { message: 'Failed to vote' })
        }
      })

      // Disconnect
      socket.on('disconnect', () => {
        const user = this.users.get(socket.id)
        if (user) {
          this.users.delete(socket.id)
          this.removeUserFromAllRooms(user.id)
          
          Logger.info('User disconnected', LogCategory.SYSTEM, {
            metadata: {
              userId: user.id,
              socketId: socket.id
            }
          })
        }
      })
    })
  }

  private async getOrCreateRoom(roomId: string, schoolId: string): Promise<ChatRoom | null> {
    try {
      const room = await db.chatRoom.findFirst({
        where: { id: roomId, schoolId }
      })

      if (room) {
        return {
          id: room.id,
          name: room.name,
          type: room.type as 'private' | 'debate',
          participants: [],
          status: room.status as 'active' | 'inactive' | 'archived'
        }
      }

      return null
    } catch (error) {
      Logger.error('Failed to get room', LogCategory.DATABASE, {
        metadata: {
          roomId,
          schoolId,
          error: (error as Error).message
        }
      }, error as Error)
      return null
    }
  }

  private async canUserJoinRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await db.chatParticipant.findFirst({
        where: {
          roomId,
          userId,
          isActive: true
        }
      })

      return !!participant
    } catch (error) {
      Logger.error('Failed to check room access', LogCategory.DATABASE, {
        metadata: {
          userId,
          roomId,
          error: (error as Error).message
        }
      }, error as Error)
      return false
    }
  }

  private addUserToRoom(roomId: string, user: SocketUser) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.participants.push(user)
    } else {
      this.rooms.set(roomId, {
        id: roomId,
        name: `Room ${roomId}`,
        type: 'private',
        participants: [user],
        status: 'active'
      })
    }
  }

  private removeUserFromRoom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.participants = room.participants.filter(p => p.id !== userId)
    }
  }

  private removeUserFromAllRooms(userId: string) {
    this.rooms.forEach((room, roomId) => {
      room.participants = room.participants.filter(p => p.id !== userId)
    })
  }

  private setTypingStatus(roomId: string, userId: string, isTyping: boolean) {
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Set())
    }

    const roomTyping = this.typingUsers.get(roomId)!
    if (isTyping) {
      roomTyping.add(userId)
    } else {
      roomTyping.delete(userId)
    }
  }

  private async saveMessage(data: {
    roomId: string
    senderId: string
    content: string
    type: string
  }) {
    return await db.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        content: data.content,
        type: data.type
      }
    })
  }

  private async createDebateSession(data: {
    roomId: string
    topic: string
    participant1Id: string
    participant2Id: string
  }) {
    // TODO: Fix debate session schema
    const session = {
      id: crypto.randomUUID(),
      roomId: data.roomId,
      topic: data.topic,
      participant1Id: data.participant1Id,
      participant2Id: data.participant2Id,
      status: 'preparing' as const
    }

    const debateSession: DebateSession = {
      id: session.id,
      roomId: session.roomId,
      topic: session.topic,
      participant1: this.users.get(session.participant1Id) || {} as SocketUser,
      participant2: this.users.get(session.participant2Id) || {} as SocketUser,
      status: 'preparing',
      votes: new Map()
    }

    this.debateSessions.set(session.id, debateSession)
    return debateSession
  }

  private async startDebatePhase(sessionId: string) {
    const session = this.debateSessions.get(sessionId)
    if (!session) return

    session.status = 'active'
    session.startTime = new Date()

    this.io.to(session.roomId).emit('debate_phase_started', {
      sessionId,
      phase: 'active',
      duration: 300 // 5 minutes
    })

    // End debate after 5 minutes
    setTimeout(() => {
      this.endDebatePhase(sessionId)
    }, 300000)
  }

  private async endDebatePhase(sessionId: string) {
    const session = this.debateSessions.get(sessionId)
    if (!session) return

    session.status = 'voting'
    session.endTime = new Date()

    this.io.to(session.roomId).emit('debate_phase_ended', {
      sessionId,
      phase: 'voting',
      duration: 60 // 1 minute for voting
    })

    // Calculate results after 1 minute
    setTimeout(() => {
      this.calculateDebateResults(sessionId)
    }, 60000)
  }

  private async calculateDebateResults(sessionId: string) {
    const session = this.debateSessions.get(sessionId)
    if (!session) return

    try {
      // TODO: Fix debate vote schema
      const votes: any[] = []
      // const votes = await db.debateVote.findMany({
      //   where: { sessionId }
      // })

      const participant1Votes = votes.filter(v => v.participantId === session.participant1.id)
      const participant2Votes = votes.filter(v => v.participantId === session.participant2.id)

      const participant1Avg = participant1Votes.reduce((sum, v) => sum + v.score, 0) / participant1Votes.length
      const participant2Avg = participant2Votes.reduce((sum, v) => sum + v.score, 0) / participant2Votes.length

      const winnerId = participant1Avg > participant2Avg ? session.participant1.id : session.participant2.id

      // Award XP
      await this.awardDebateXP(sessionId, participant1Avg, participant2Avg, winnerId)

      session.status = 'completed'

      this.io.to(session.roomId).emit('debate_results', {
        sessionId,
        participant1: {
          id: session.participant1.id,
          name: session.participant1.name,
          averageScore: participant1Avg,
          voteCount: participant1Votes.length
        },
        participant2: {
          id: session.participant2.id,
          name: session.participant2.name,
          averageScore: participant2Avg,
          voteCount: participant2Votes.length
        },
        winnerId
      })

    } catch (error) {
      Logger.error('Failed to calculate debate results', LogCategory.SYSTEM, {
        metadata: {
          sessionId,
          error: (error as Error).message
        }
      }, error as Error)
    }
  }

  private async saveDebateVote(data: {
    sessionId: string
    voterId: string
    participantId: string
    score: number
    criteria: any
  }) {
    // TODO: Fix debate vote schema
    return {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      voterId: data.voterId,
      participantId: data.participantId,
      score: data.score,
      criteria: data.criteria
    }
  }

  private async awardDebateXP(sessionId: string, score1: number, score2: number, winnerId: string) {
    try {
      // TODO: Fix debate session schema
      const session = this.debateSessions.get(sessionId)
      // const session = await db.debateSession.findUnique({
      //   where: { id: sessionId }
      // })

      if (!session) return

      // Award XP based on performance
      const xp1 = this.calculateDebateXP(score1, winnerId === session.participant1.id)
      const xp2 = this.calculateDebateXP(score2, winnerId === session.participant2.id)

      // Update XP in database (you'll need to implement this)
      // await updateUserXP(session.participant1Id, xp1)
      // await updateUserXP(session.participant2Id, xp2)

      Logger.info('Debate XP awarded', LogCategory.SYSTEM, {
        metadata: {
          sessionId,
          participant1XP: xp1,
          participant2XP: xp2,
          winnerId
        }
      })

    } catch (error) {
      Logger.error('Failed to award debate XP', LogCategory.SYSTEM, {
        metadata: {
          sessionId,
          error: (error as Error).message
        }
      }, error as Error)
    }
  }

  private calculateDebateXP(score: number, isWinner: boolean): number {
    let baseXP = 20 // Base XP for participation
    
    if (isWinner) {
      baseXP += 50 // Winner bonus
    }
    
    if (score >= 9) {
      baseXP += 100 // Excellent performance bonus
    } else if (score >= 8) {
      baseXP += 50 // Good performance bonus
    } else if (score >= 7) {
      baseXP += 30 // Decent performance bonus
    }

    return baseXP
  }

  private startCleanupInterval() {
    // Clean up inactive typing users every 30 seconds
    setInterval(() => {
      const now = Date.now()
      this.typingUsers.forEach((typingUsers, roomId) => {
        typingUsers.forEach((userId) => {
          // Remove users who haven't typed in 5 seconds
          if (now - Date.now() > 5000) {
            typingUsers.delete(userId)
          }
        })
      })
    }, 30000)
  }

  public getIO() {
    return this.io
  }
}

export default ChatWebSocketServer
