/**
 * Script to create Question table directly using Prisma Client
 * This bypasses the prisma db push command which has TLS issues
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Use the same connection string that works in diagnose script
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function createQuestionTable() {
  console.log("🔧 Creating Question table directly...\n")

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, "create-question-table.sql")
    const sql = fs.readFileSync(sqlPath, "utf-8")

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    console.log(`Executing ${statements.length} SQL statements...\n`)

    // First, ensure we're connected
    await prisma.$connect()
    console.log("✅ Connected to database\n")

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executing...`)
          // Use Prisma.$executeRaw with template literal for better compatibility
          await prisma.$executeRawUnsafe(statement + ";")
          console.log(`✅ Statement ${i + 1} executed successfully`)
        } catch (error: any) {
          // Ignore "already exists" errors
          if (
            error.message?.includes("already exists") ||
            error.message?.includes("duplicate") ||
            error.message?.includes("relation") && error.message?.includes("already exists") ||
            error.code === "42P07" // relation already exists
          ) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`)
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message)
            console.error(`   Code:`, error.code)
            // Don't throw, continue with other statements
          }
        }
      }
    }

    // Verify table was created
    console.log("\n🔍 Verifying table creation...")
    const count = await prisma.question.count()
    console.log(`✅ Question table exists! Current count: ${count}`)

    console.log("\n✅ Question table created successfully!")
  } catch (error: any) {
    console.error("\n❌ Error creating table:", error.message)
    console.error("Code:", error.code)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createQuestionTable().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
