/**
 * Contentlayer utilities
 * Handles importing allDocs with fallback for when contentlayer hasn't generated files yet
 */

// Dynamic import to handle contentlayer generated files
export async function getAllDocsAsync() {
  try {
    // Try importing from .contentlayer/generated
    const generated = await import("../../.contentlayer/generated/index.mjs")
    return generated.allDocs || []
  } catch (e) {
    console.warn(
      "[Contentlayer] Generated files not found. " +
      "Make sure to run 'npm run dev' to generate docs."
    )
    return []
  }
}

// Synchronous version (for use in server components)
export function getAllDocs() {
  try {
    // Use dynamic require for Node.js
    const path = require("path")
    const fs = require("fs")
    const generatedPath = path.join(process.cwd(), ".contentlayer/generated/index.mjs")
    
    if (fs.existsSync(generatedPath)) {
      // Delete require cache to allow hot reload
      delete require.cache[require.resolve("../../.contentlayer/generated/index.mjs")]
      const generated = require("../../.contentlayer/generated/index.mjs")
      return generated.allDocs || []
    }
    
    return []
  } catch (e) {
    // Fallback: return empty array
    return []
  }
}

// Export for direct use (will be populated when contentlayer runs)
export const allDocs: any[] = []
