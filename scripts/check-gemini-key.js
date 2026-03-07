/**
 * Quick script to check if GEMINI_API_KEY is configured
 * 
 * Usage: node scripts/check-gemini-key.js
 */

require('dotenv').config()

const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

console.log("\n🔍 Checking Gemini API Key Configuration...\n")

if (!geminiKey) {
  console.log("❌ GEMINI_API_KEY not found in environment variables")
  console.log("\n💡 Solution:")
  console.log("1. Open .env file in project root")
  console.log("2. Add: GEMINI_API_KEY=\"your-api-key-here\"")
  console.log("3. Get API key from: https://aistudio.google.com/app/apikey")
  console.log("4. Restart Next.js server (npm run dev)\n")
  process.exit(1)
}

if (geminiKey === "your-gemini-api-key-here" || geminiKey.trim().length === 0) {
  console.log("❌ GEMINI_API_KEY is set but contains placeholder value")
  console.log("\n💡 Solution:")
  console.log("1. Replace 'your-gemini-api-key-here' with actual API key")
  console.log("2. Get API key from: https://aistudio.google.com/app/apikey")
  console.log("3. Restart Next.js server\n")
  process.exit(1)
}

if (!geminiKey.startsWith("AIza")) {
  console.log("⚠️  Warning: GEMINI_API_KEY doesn't start with 'AIza'")
  console.log("   This might not be a valid Gemini API key")
  console.log("   Expected format: AIzaSy...\n")
}

console.log("✅ GEMINI_API_KEY is configured")
console.log(`   Key prefix: ${geminiKey.substring(0, 10)}...`)
console.log(`   Key length: ${geminiKey.length} characters`)
console.log("\n✅ Configuration looks good!")
console.log("   If you still see errors, make sure to restart Next.js server\n")
