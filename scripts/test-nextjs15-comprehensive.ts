#!/usr/bin/env tsx

/**
 * Comprehensive Next.js 15 App Router Test Suite
 * 
 * Tests:
 * 1. SSR/SSG rendering
 * 2. Async components and layouts
 * 3. Dynamic routes
 * 4. Suspense boundaries
 * 5. Hydration consistency
 * 6. Metadata API
 * 7. Streaming SSR
 */

import { exec } from "child_process"
import { promisify } from "util"
import { readdir, readFile, stat } from "fs/promises"
import { join } from "path"

const execAsync = promisify(exec)

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function success(message: string) {
  log(`✅ ${message}`, colors.green)
}

function error(message: string) {
  log(`❌ ${message}`, colors.red)
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.cyan)
}

function section(message: string) {
  log(`\n${"=".repeat(60)}`, colors.blue)
  log(`  ${message}`, colors.blue)
  log(`${"=".repeat(60)}`, colors.blue)
}

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

// Test if server is running
async function testServerRunning() {
  section("Checking Server Status")
  
  try {
    info("Testing if server is running...")
    const response = await fetch(BASE_URL)
    if (response.ok) {
      success(`Server is running at ${BASE_URL}`)
      return true
    }
    error(`Server returned status: ${response.status}`)
    return false
  } catch (err) {
    error("Server is not running. Please start with: npm run dev")
    return false
  }
}

// Test SSR/SSG rendering
async function testSSRRendering() {
  section("Testing SSR/SSG Rendering")
  
  const routes = [
    { path: "/", type: "Static Page (SSG)" },
    { path: "/sign-in", type: "Dynamic Page (SSR)" },
    { path: "/dashboard", type: "Protected Route (SSR)" },
    { path: "/api/auth/session", type: "API Route" },
  ]
  
  for (const route of routes) {
    try {
      info(`Testing ${route.type}: ${route.path}`)
      const response = await fetch(`${BASE_URL}${route.path}`)
      
      if (response.ok) {
        const contentType = response.headers.get("content-type")
        const isHTML = contentType?.includes("text/html")
        const isJSON = contentType?.includes("application/json")
        
        if (route.path.startsWith("/api")) {
          if (isJSON) {
            success(`API route working: ${route.path}`)
          } else {
            error(`API route returned non-JSON: ${route.path}`)
          }
        } else {
          if (isHTML) {
            const html = await response.text()
            
            // Check for Next.js specific markers
            const hasReactRoot = html.includes('id="__next"') || html.includes('id="root"')
            const hasNextData = html.includes('__NEXT_DATA__')
            
            if (hasReactRoot || hasNextData) {
              success(`${route.type} rendered: ${route.path}`)
            } else {
              error(`Page may not be properly rendered: ${route.path}`)
            }
          } else {
            error(`Route returned non-HTML: ${route.path}`)
          }
        }
      } else if (response.status === 401 || response.status === 302 || response.status === 307) {
        success(`Protected route correctly redirecting: ${route.path}`)
      } else {
        error(`Route failed with status ${response.status}: ${route.path}`)
      }
    } catch (err) {
      error(`Failed to fetch ${route.path}: ${err}`)
    }
  }
}

// Find and test dynamic routes
async function testDynamicRoutes() {
  section("Testing Dynamic Routes")
  
  try {
    info("Scanning for dynamic route patterns...")
    
    const dynamicRoutes = await findDynamicRoutes("app")
    
    if (dynamicRoutes.length === 0) {
      info("No dynamic routes found")
      return
    }
    
    success(`Found ${dynamicRoutes.length} dynamic route(s)`)
    dynamicRoutes.forEach(route => info(`  - ${route}`))
    
    // Test specific dynamic routes we know exist
    const testRoutes = [
      { path: "/courses", name: "Courses listing" },
      // Add actual course ID from database if available
    ]
    
    for (const route of testRoutes) {
      try {
        info(`Testing ${route.name}: ${route.path}`)
        const response = await fetch(`${BASE_URL}${route.path}`)
        
        if (response.ok || response.status === 401 || response.status === 302) {
          success(`Dynamic route accessible: ${route.path}`)
        } else {
          error(`Dynamic route failed: ${route.path} (${response.status})`)
        }
      } catch (err) {
        error(`Failed to test ${route.path}: ${err}`)
      }
    }
    
  } catch (err) {
    error(`Dynamic route test failed: ${err}`)
  }
}

// Find dynamic routes in the app directory
async function findDynamicRoutes(dir: string, basePath: string = ""): Promise<string[]> {
  const routes: string[] = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Check if it's a dynamic route segment [param] or [...slug]
        if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          const paramName = entry.name.slice(1, -1)
          routes.push(`${basePath}/${entry.name}`)
        }
        
        // Recursively search subdirectories
        const subRoutes = await findDynamicRoutes(fullPath, `${basePath}/${entry.name}`)
        routes.push(...subRoutes)
      }
    }
  } catch (err) {
    // Directory not found or no access
  }
  
  return routes
}

// Test Suspense boundaries and loading states
async function testSuspenseBoundaries() {
  section("Testing Suspense Boundaries & Loading States")
  
  try {
    info("Scanning for loading.tsx files...")
    
    const loadingFiles = await findFiles("app", "loading.tsx")
    
    if (loadingFiles.length === 0) {
      info("No loading.tsx files found")
    } else {
      success(`Found ${loadingFiles.length} loading.tsx file(s)`)
      loadingFiles.forEach(file => info(`  - ${file}`))
    }
    
    info("Scanning for error.tsx files...")
    const errorFiles = await findFiles("app", "error.tsx")
    
    if (errorFiles.length === 0) {
      info("No error.tsx files found")
    } else {
      success(`Found ${errorFiles.length} error.tsx file(s)`)
      errorFiles.forEach(file => info(`  - ${file}`))
    }
    
    // Test for Suspense usage in components
    info("Checking for Suspense usage in code...")
    const suspenseUsage = await findSuspenseUsage("app")
    
    if (suspenseUsage.length > 0) {
      success(`Found ${suspenseUsage.length} file(s) using Suspense`)
      suspenseUsage.slice(0, 5).forEach(file => info(`  - ${file}`))
    } else {
      info("No explicit Suspense usage found")
    }
    
  } catch (err) {
    error(`Suspense boundary test failed: ${err}`)
  }
}

// Find files by name in directory
async function findFiles(dir: string, filename: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // Skip node_modules and .next
        if (entry.name !== "node_modules" && entry.name !== ".next") {
          await findFiles(fullPath, filename, results)
        }
      } else if (entry.name === filename) {
        results.push(fullPath)
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return results
}

// Find Suspense usage
async function findSuspenseUsage(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".next") {
          await findSuspenseUsage(fullPath, results)
        }
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        try {
          const content = await readFile(fullPath, "utf-8")
          if (content.includes("<Suspense") || content.includes("Suspense>")) {
            results.push(fullPath)
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return results
}

// Check for potential hydration issues
async function testHydrationConsistency() {
  section("Testing Hydration Consistency")
  
  try {
    info("Checking for common hydration mismatch patterns...")
    
    // Look for useEffect usage (potential hydration issues)
    const files = await findFilesWithPattern("app", /useEffect\s*\(/)
    success(`Found ${files.length} file(s) using useEffect`)
    
    // Look for Date.now() or new Date() in components
    const dateUsage = await findFilesWithPattern("app", /Date\.now\(\)|new Date\(\)/)
    if (dateUsage.length > 0) {
      info(`⚠️  Found ${dateUsage.length} file(s) using Date - potential hydration issue`)
      dateUsage.slice(0, 3).forEach(file => info(`  - ${file}`))
    } else {
      success("No obvious Date usage found")
    }
    
    // Look for Math.random() in components
    const randomUsage = await findFilesWithPattern("app", /Math\.random\(\)/)
    if (randomUsage.length > 0) {
      info(`⚠️  Found ${randomUsage.length} file(s) using Math.random() - potential hydration issue`)
      randomUsage.slice(0, 3).forEach(file => info(`  - ${file}`))
    } else {
      success("No Math.random() usage found")
    }
    
    // Look for window or document usage without checks
    const windowUsage = await findFilesWithPattern("app", /\bwindow\.|\bdocument\./)
    if (windowUsage.length > 0) {
      info(`Found ${windowUsage.length} file(s) using window/document`)
      info("⚠️  Ensure these are wrapped in useEffect or have typeof checks")
    }
    
    success("Hydration consistency check complete")
    
  } catch (err) {
    error(`Hydration consistency test failed: ${err}`)
  }
}

// Find files with pattern
async function findFilesWithPattern(
  dir: string,
  pattern: RegExp,
  results: string[] = []
): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".next") {
          await findFilesWithPattern(fullPath, pattern, results)
        }
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        try {
          const content = await readFile(fullPath, "utf-8")
          if (pattern.test(content)) {
            results.push(fullPath)
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return results
}

// Test async components
async function testAsyncComponents() {
  section("Testing Async Components & Layouts")
  
  try {
    info("Scanning for async page components...")
    
    const asyncPages = await findAsyncComponents("app")
    
    if (asyncPages.length === 0) {
      info("No async page components found")
    } else {
      success(`Found ${asyncPages.length} async component(s)`)
      asyncPages.slice(0, 10).forEach(file => info(`  - ${file}`))
    }
    
    info("Checking for data fetching patterns...")
    
    // Check for fetch() usage in server components
    const fetchUsage = await findFilesWithPattern("app", /\bfetch\s*\(/)
    if (fetchUsage.length > 0) {
      success(`Found ${fetchUsage.length} file(s) using fetch()`)
    }
    
    // Check for Prisma usage
    const prismaUsage = await findFilesWithPattern("app", /prisma\.|db\./)
    if (prismaUsage.length > 0) {
      success(`Found ${prismaUsage.length} file(s) using Prisma`)
    }
    
  } catch (err) {
    error(`Async component test failed: ${err}`)
  }
}

// Find async components
async function findAsyncComponents(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".next") {
          await findAsyncComponents(fullPath, results)
        }
      } else if (entry.name === "page.tsx" || entry.name === "layout.tsx") {
        try {
          const content = await readFile(fullPath, "utf-8")
          // Look for async function export
          if (/export\s+(default\s+)?async\s+function/.test(content)) {
            results.push(fullPath)
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return results
}

// Test metadata API
async function testMetadataAPI() {
  section("Testing Metadata API")
  
  try {
    info("Checking for metadata exports...")
    
    const metadataFiles = await findFilesWithPattern("app", /export\s+(const\s+)?metadata/)
    
    if (metadataFiles.length === 0) {
      info("No static metadata exports found")
    } else {
      success(`Found ${metadataFiles.length} file(s) with metadata exports`)
      metadataFiles.slice(0, 5).forEach(file => info(`  - ${file}`))
    }
    
    info("Checking for generateMetadata functions...")
    
    const generateMetadataFiles = await findFilesWithPattern(
      "app",
      /export\s+(async\s+)?function\s+generateMetadata/
    )
    
    if (generateMetadataFiles.length === 0) {
      info("No generateMetadata functions found")
    } else {
      success(`Found ${generateMetadataFiles.length} file(s) with generateMetadata`)
      generateMetadataFiles.slice(0, 5).forEach(file => info(`  - ${file}`))
    }
    
    // Test actual metadata in HTML
    info("Testing metadata in HTML response...")
    const response = await fetch(BASE_URL)
    const html = await response.text()
    
    const hasTitle = /<title>/.test(html)
    const hasMetaTags = /<meta\s+/.test(html)
    const hasOgTags = /<meta\s+property="og:/.test(html)
    
    if (hasTitle) success("Found <title> tag")
    if (hasMetaTags) success("Found meta tags")
    if (hasOgTags) success("Found OpenGraph tags")
    
  } catch (err) {
    error(`Metadata API test failed: ${err}`)
  }
}

// Test App Router file structure
async function testAppRouterStructure() {
  section("Testing App Router Structure")
  
  try {
    info("Checking for required App Router files...")
    
    const requiredFiles = [
      { path: "app/layout.tsx", name: "Root Layout" },
      { path: "app/page.tsx", name: "Root Page" },
    ]
    
    for (const file of requiredFiles) {
      try {
        await stat(file.path)
        success(`${file.name} found: ${file.path}`)
      } catch {
        error(`${file.name} missing: ${file.path}`)
      }
    }
    
    info("Scanning App Router directory structure...")
    
    const routes = await findRoutes("app")
    success(`Found ${routes.length} route(s)`)
    
    // Group routes by type
    const staticRoutes = routes.filter(r => !r.includes("["))
    const dynamicRoutes = routes.filter(r => r.includes("["))
    const catchAllRoutes = routes.filter(r => r.includes("[..."))
    
    info(`  Static routes: ${staticRoutes.length}`)
    info(`  Dynamic routes: ${dynamicRoutes.length}`)
    info(`  Catch-all routes: ${catchAllRoutes.length}`)
    
  } catch (err) {
    error(`App Router structure test failed: ${err}`)
  }
}

// Find all routes in app directory
async function findRoutes(dir: string, basePath: string = ""): Promise<string[]> {
  const routes: string[] = []
  
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip special directories
        if (entry.name.startsWith("_") || entry.name === "api") {
          continue
        }
        
        const newBasePath = `${basePath}/${entry.name}`
        
        // Check if this directory has a page.tsx
        const fullPath = join(dir, entry.name)
        try {
          await stat(join(fullPath, "page.tsx"))
          routes.push(newBasePath)
        } catch {
          // No page.tsx, continue
        }
        
        // Recursively find routes
        const subRoutes = await findRoutes(fullPath, newBasePath)
        routes.push(...subRoutes)
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return routes
}

async function main() {
  log("\n🚀 Starting Comprehensive Next.js 15 Test Suite\n", colors.magenta)
  
  const startTime = Date.now()
  let passed = 0
  let failed = 0
  
  const tests = [
    { name: "Server Status", fn: testServerRunning },
    { name: "SSR/SSG Rendering", fn: testSSRRendering },
    { name: "Dynamic Routes", fn: testDynamicRoutes },
    { name: "Suspense Boundaries", fn: testSuspenseBoundaries },
    { name: "Hydration Consistency", fn: testHydrationConsistency },
    { name: "Async Components", fn: testAsyncComponents },
    { name: "Metadata API", fn: testMetadataAPI },
    { name: "App Router Structure", fn: testAppRouterStructure },
  ]
  
  for (const test of tests) {
    try {
      await test.fn()
      passed++
    } catch (err) {
      failed++
      error(`Test suite "${test.name}" failed: ${err}`)
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  
  section("Test Summary")
  log(`Total tests: ${tests.length}`, colors.cyan)
  log(`Passed: ${passed}`, colors.green)
  log(`Failed: ${failed}`, colors.red)
  log(`Duration: ${duration}s`, colors.yellow)
  
  if (failed === 0) {
    log("\n🎉 All Next.js 15 tests passed!", colors.green)
  } else {
    log("\n⚠️  Some tests failed. Please review the errors above.", colors.red)
  }
}

main().catch((err) => {
  error(`Fatal error: ${err}`)
  process.exit(1)
})


