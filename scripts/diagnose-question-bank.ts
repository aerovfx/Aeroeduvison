/**
 * Diagnostic script to check Question Bank database setup
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function diagnose() {
  console.log("🔍 Diagnosing Question Bank Database Setup...\n")

  // 1. Check if Prisma client has Question model
  console.log("1. Checking Prisma Client...")
  console.log("   Question model exists:", !!prisma.question)
  console.log("   Available models:", Object.keys(prisma).filter(k => !k.startsWith("_") && !k.startsWith("$")).sort())

  // 2. Try to connect to database
  console.log("\n2. Testing database connection...")
  try {
    await prisma.$connect()
    console.log("   ✅ Database connection successful")
  } catch (error: any) {
    console.log("   ❌ Database connection failed:")
    console.log("      Error:", error.message)
    console.log("      Code:", error.code)
    await prisma.$disconnect()
    process.exit(1)
  }

  // 3. Check if Question table exists
  console.log("\n3. Checking if Question table exists...")
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Question'
      );
    `
    const exists = (result as any[])[0]?.exists
    console.log("   Table 'Question' exists:", exists ? "✅ YES" : "❌ NO")
    
    if (!exists) {
      console.log("\n   ⚠️  The Question table does not exist in the database!")
      console.log("   Solution: Run 'npx prisma db push' to create the table")
    }
  } catch (error: any) {
    console.log("   ❌ Error checking table existence:")
    console.log("      Error:", error.message)
    console.log("      Code:", error.code)
    if (error.code === "P2021" || error.message?.includes("does not exist")) {
      console.log("\n   ⚠️  The Question table does not exist in the database!")
      console.log("   Solution: Run 'npx prisma db push' to create the table")
    }
  }

  // 4. Try to query Question table
  console.log("\n4. Testing Question table query...")
  try {
    const count = await prisma.question.count()
    console.log("   ✅ Query successful")
    console.log("   Total questions:", count)
  } catch (error: any) {
    console.log("   ❌ Query failed:")
    console.log("      Error:", error.message)
    console.log("      Code:", error.code)
    console.log("      Meta:", JSON.stringify(error.meta, null, 2))
    
    if (error.code === "P2021" || error.message?.includes("does not exist") || error.message?.includes("relation")) {
      console.log("\n   ⚠️  ROOT CAUSE: The Question table does not exist in the database!")
      console.log("   Solution: Run 'npx prisma db push' to create the table")
      console.log("   Note: If you get TLS certificate errors, check your DATABASE_URL SSL settings")
    }
  }

  await prisma.$disconnect()
  console.log("\n✅ Diagnosis complete")
}

diagnose().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
