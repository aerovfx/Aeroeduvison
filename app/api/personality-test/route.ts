import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST - Save test result
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === "save") {
      const { mbtiType, mbtiScores, hollandCode, hollandScores, personalityName, careers, answers } = body

      // Ensure table exists (idempotent)
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PersonalityTestResult" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "studentId" TEXT NOT NULL,
          "mbtiType" TEXT NOT NULL,
          "mbtiScores" JSONB NOT NULL DEFAULT '{}',
          "hollandCode" TEXT NOT NULL,
          "hollandScores" JSONB NOT NULL DEFAULT '{}',
          "personalityName" TEXT NOT NULL,
          "careers" JSONB NOT NULL DEFAULT '[]',
          "answers" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PersonalityTestResult_pkey" PRIMARY KEY ("id")
        )
      `)

      // Create indexes if not exist
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PersonalityTestResult_studentId_idx" ON "PersonalityTestResult"("studentId")
      `)
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PersonalityTestResult_createdAt_idx" ON "PersonalityTestResult"("createdAt")
      `)

      // Insert result
      const result = await db.$executeRawUnsafe(`
        INSERT INTO "PersonalityTestResult" ("id", "studentId", "mbtiType", "mbtiScores", "hollandCode", "hollandScores", "personalityName", "careers", "answers", "createdAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, $4, $5::jsonb, $6, $7::jsonb, $8::jsonb, NOW())
        RETURNING "id"
      `,
        session.user.id,
        mbtiType,
        JSON.stringify(mbtiScores),
        hollandCode,
        JSON.stringify(hollandScores),
        personalityName,
        JSON.stringify(careers),
        JSON.stringify(answers),
      )

      return NextResponse.json({ success: true, message: "Đã lưu kết quả" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Personality test error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}

// GET - Get test history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    if (action === "history") {
      // Ensure table exists
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PersonalityTestResult" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "studentId" TEXT NOT NULL,
          "mbtiType" TEXT NOT NULL,
          "mbtiScores" JSONB NOT NULL DEFAULT '{}',
          "hollandCode" TEXT NOT NULL,
          "hollandScores" JSONB NOT NULL DEFAULT '{}',
          "personalityName" TEXT NOT NULL,
          "careers" JSONB NOT NULL DEFAULT '[]',
          "answers" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PersonalityTestResult_pkey" PRIMARY KEY ("id")
        )
      `)

      const results: any[] = await db.$queryRawUnsafe(`
        SELECT "id", "mbtiType", "mbtiScores", "hollandCode", "hollandScores", "personalityName", "careers", "createdAt"
        FROM "PersonalityTestResult"
        WHERE "studentId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 20
      `, session.user.id)

      return NextResponse.json({ success: true, data: results })
    }

    if (action === "detail") {
      const id = searchParams.get("id")
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

      const results: any[] = await db.$queryRawUnsafe(`
        SELECT * FROM "PersonalityTestResult"
        WHERE "id" = $1 AND "studentId" = $2
        LIMIT 1
      `, id, session.user.id)

      if (results.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: results[0] })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Personality test history error:", error)
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
