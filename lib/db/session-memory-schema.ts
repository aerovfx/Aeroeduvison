// ===================================================================================
// SESSION MEMORY MODELS - For AI Tutor Context Retention
// ===================================================================================

model ChatSession {
  id               String        @id @default(cuid())
  userId           String
  agentType        String        // 'tutor' | 'researcher' | 'predictor'
  title            String?
  status           String        @default("active") // 'active' | 'archived' | 'ended']
  messageCount     Int           @default(0)
  
  // Context
  subject          String?
  topic            String?
  grade            String?
  
  // Analytics
  totalXPEarned    Int           @default(0)
  lessonsCompleted Int           @default(0)
  correctAnswers   Int           @default(0)
  totalQuestions   Int           @default(0)
  
  // Metadata
  metadata         Json? // Custom data: emotions, goals, etc.
  
  // Relations
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages         AISessionMessage[]
  memories         SessionMemory[]
  summaries        SessionSummary[]
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  lastActivityAt   DateTime      @default(now())
  endedAt          DateTime?

  @@index([userId])
  @@index([agentType])
  @@index([status])
  @@index([grade])
  @@index([createdAt])
  @@index([lastActivityAt])
}

model AISessionMessage {
  id               String        @id @default(cuid())
  sessionId        String
  role             String        // 'user' | 'assistant'
  content          String        // Message text (can be long)
  
  // Analysis
  sentiment        String?       // 'positive' | 'neutral' | 'negative'
  confidence       Float?        // 0-1 sentiment confidence
  entities         Json?         // Extracted entities/keywords
  intent           String?       // User intent classification
  
  // Metadata
  metadata         Json?
  
  session          ChatSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  createdAt        DateTime      @default(now())

  @@index([sessionId])
  @@index([role])
  @@index([sentiment])
  @@index([createdAt])
}

model SessionMemory {
  id               String        @id @default(cuid())
  sessionId        String
  key              String        // e.g., 'learning_objective', 'misconception', etc.
  value            Json          // The stored memory value
  confidence       Float         @default(0.8) // How confident is this memory
  
  // Lifecycle
  type             String        @default("fact") // 'fact' | 'misconception' | 'strength' | 'goal'
  importance       Int           @default(1) // 1-5 scale
  mentionCount     Int           @default(1) // How many times mentioned
  lastMentionedAt  DateTime      @default(now())
  
  session          ChatSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@unique([sessionId, key])
  @@index([sessionId])
  @@index([type])
  @@index([importance])
  @@index([lastMentionedAt])
}

model SessionSummary {
  id               String        @id @default(cuid())
  sessionId        String        @unique
  
  // Summary content
  mainTopics       String[]      // Array of main topics discussed
  keyLearnings     String[]      // Array of key learnings
  misconceptions   String[]      // Array of misconceptions identified
  strengths        String[]      // Array of student strengths
  improvements     String[]      // Array of areas for improvement
  
  // Statistics
  messageCount     Int
  duration         Int           // In seconds
  questionsAsked   Int           @default(0)
  correctAnswers   Int           @default(0)
  
  // Generation
  generatedBy      String?       // Model/method used to generate summary
  confidence       Float         @default(0.8)
  
  session          ChatSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  createdAt        DateTime      @default(now())

  @@index([sessionId])
  @@index([createdAt])
}

model UserLearningProfile {
  id               String        @id @default(cuid())
  userId           String        @unique
  
  // Learning Style
  preferredStyle   String?       // 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing'
  learningPace     String        @default("medium") // 'fast' | 'medium' | 'slow'
  
  // Skills & Knowledge
  coreStrengths    String[]      // Array of subject strengths
  areasForGrowth   String[]      // Array of areas needing improvement
  knownMisconceptions String[]   // Common mistakes
  
  // Analytics
  totalSessions    Int           @default(0)
  totalHours       Float         @default(0)
  totalXP          Int           @default(0)
  averageSessionDuration Float @default(0) // In minutes
  
  // Preferences
  difficultyLevel  String        @default("medium")
  preferredSubjects String[]
  languagePreference String      @default("vi")
  
  // Metadata
  metadata         Json?
  
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([userId])
}
