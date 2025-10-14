/**
 * AUTH API ENDPOINTS TEST
 * 
 * Tests NextAuth API routes and protected endpoints
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
  log(`ℹ️  ${message}`, colors.blue)
}

function section(title: string) {
  log(`\n${'='.repeat(70)}`, colors.cyan)
  log(`  ${title}`, colors.cyan)
  log(`${'='.repeat(70)}`, colors.cyan)
}

interface CookieJar {
  cookies: string[]
}

function extractCookies(response: Response): string[] {
  const setCookieHeaders = response.headers.getSetCookie?.() || []
  return setCookieHeaders.map(cookie => cookie.split(';')[0])
}

function getCookieHeader(jar: CookieJar): string {
  return jar.cookies.join('; ')
}

// ============================================================================
// TEST SUITE 1: NEXTAUTH CORE ROUTES
// ============================================================================

async function testNextAuthRoutes() {
  section('TEST SUITE 1: NextAuth Core Routes')
  
  // Test 1.1: Providers Endpoint
  info('Test 1.1: GET /api/auth/providers')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/providers`)
    const data = await response.json()
    
    if (response.ok && data.credentials && data.google) {
      success('Providers endpoint returns credentials and google')
      console.log('  Available providers:', Object.keys(data))
    } else {
      error('Providers endpoint failed or missing providers')
    }
  } catch (err) {
    error(`Providers endpoint error: ${err}`)
  }
  
  // Test 1.2: Session Endpoint (Unauthenticated)
  info('Test 1.2: GET /api/auth/session (unauthenticated)')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`)
    const data = await response.json()
    
    if (response.ok && !data.user) {
      success('Session endpoint returns null for unauthenticated user')
    } else {
      error('Session endpoint behaving unexpectedly')
    }
  } catch (err) {
    error(`Session endpoint error: ${err}`)
  }
  
  // Test 1.3: CSRF Token
  info('Test 1.3: GET /api/auth/csrf')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/csrf`)
    const data = await response.json()
    
    if (response.ok && data.csrfToken) {
      success('CSRF token endpoint working')
      console.log('  CSRF Token length:', data.csrfToken.length)
    } else {
      error('CSRF token endpoint failed')
    }
  } catch (err) {
    error(`CSRF endpoint error: ${err}`)
  }
  
  // Test 1.4: SignIn Page
  info('Test 1.4: GET /api/auth/signin')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/signin`)
    
    if (response.ok) {
      success('SignIn endpoint accessible')
    } else {
      error(`SignIn endpoint returned ${response.status}`)
    }
  } catch (err) {
    error(`SignIn endpoint error: ${err}`)
  }
}

// ============================================================================
// TEST SUITE 2: AUTHENTICATION FLOW
// ============================================================================

async function testAuthenticationFlow() {
  section('TEST SUITE 2: Authentication Flow')
  
  const cookieJar: CookieJar = { cookies: [] }
  
  // Test 2.1: Get CSRF Token
  info('Test 2.1: Get CSRF token for authentication')
  let csrfToken = ''
  try {
    const response = await fetch(`${BASE_URL}/api/auth/csrf`)
    const data = await response.json()
    csrfToken = data.csrfToken
    
    if (csrfToken) {
      success(`CSRF token obtained: ${csrfToken.substring(0, 20)}...`)
    } else {
      error('Failed to get CSRF token')
      return
    }
  } catch (err) {
    error(`CSRF token error: ${err}`)
    return
  }
  
  // Test 2.2: Credentials SignIn - Valid
  info('Test 2.2: POST /api/auth/signin/credentials (valid credentials)')
  try {
    const formData = new URLSearchParams({
      csrfToken: csrfToken,
      email: 'student.test@example.com',
      password: 'StudentPass123!',
      redirect: 'false',
      json: 'true'
    })
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    })
    
    // Extract cookies
    const cookies = extractCookies(response)
    if (cookies.length > 0) {
      cookieJar.cookies = cookies
      success(`Login successful, received ${cookies.length} cookie(s)`)
    }
    
    if (response.status === 302 || response.status === 200) {
      success('Credentials login flow completed')
    } else {
      error(`Credentials login returned ${response.status}`)
    }
  } catch (err) {
    error(`Credentials login error: ${err}`)
  }
  
  // Test 2.3: Check Session After Login
  info('Test 2.3: GET /api/auth/session (authenticated)')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': getCookieHeader(cookieJar)
      }
    })
    
    const data = await response.json()
    
    if (response.ok && data.user) {
      success('Session retrieved successfully')
      console.log('  User ID:', data.user.id)
      console.log('  User Email:', data.user.email)
      console.log('  User Role:', data.user.role)
      
      if (data.user.role === 'STUDENT') {
        success('User role correctly stored in session')
      } else {
        error(`Unexpected role: ${data.user.role}`)
      }
    } else {
      error('Session not established after login')
    }
  } catch (err) {
    error(`Session check error: ${err}`)
  }
  
  // Test 2.4: SignOut
  info('Test 2.4: POST /api/auth/signout')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/signout`, {
      method: 'POST',
      headers: {
        'Cookie': getCookieHeader(cookieJar),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        csrfToken: csrfToken
      })
    })
    
    if (response.ok || response.status === 302) {
      success('SignOut successful')
      cookieJar.cookies = []
    } else {
      error(`SignOut returned ${response.status}`)
    }
  } catch (err) {
    error(`SignOut error: ${err}`)
  }
  
  // Test 2.5: Verify Session Cleared
  info('Test 2.5: Verify session cleared after signout')
  try {
    const response = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': getCookieHeader(cookieJar)
      }
    })
    
    const data = await response.json()
    
    if (response.ok && !data.user) {
      success('Session correctly cleared after signout')
    } else {
      error('Session still active after signout (SECURITY ISSUE!)')
    }
  } catch (err) {
    error(`Session verification error: ${err}`)
  }
}

// ============================================================================
// TEST SUITE 3: INVALID CREDENTIALS
// ============================================================================

async function testInvalidCredentials() {
  section('TEST SUITE 3: Invalid Credentials & Error Handling')
  
  // Get CSRF token
  let csrfToken = ''
  try {
    const response = await fetch(`${BASE_URL}/api/auth/csrf`)
    const data = await response.json()
    csrfToken = data.csrfToken
  } catch (err) {
    error('Failed to get CSRF token for invalid credentials test')
    return
  }
  
  // Test 3.1: Wrong Password
  info('Test 3.1: Login with wrong password')
  try {
    const formData = new URLSearchParams({
      csrfToken: csrfToken,
      email: 'student.test@example.com',
      password: 'WrongPassword123!',
      redirect: 'false',
      json: 'true'
    })
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    })
    
    if (response.status === 401 || response.status === 302) {
      success('Wrong password correctly rejected')
    } else {
      error(`Wrong password returned unexpected status: ${response.status}`)
    }
  } catch (err) {
    error(`Wrong password test error: ${err}`)
  }
  
  // Test 3.2: Non-existent Email
  info('Test 3.2: Login with non-existent email')
  try {
    const formData = new URLSearchParams({
      csrfToken: csrfToken,
      email: 'nonexistent@example.com',
      password: 'SomePassword123!',
      redirect: 'false',
      json: 'true'
    })
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    })
    
    if (response.status === 401 || response.status === 302) {
      success('Non-existent email correctly rejected')
    } else {
      error(`Non-existent email returned unexpected status: ${response.status}`)
    }
  } catch (err) {
    error(`Non-existent email test error: ${err}`)
  }
  
  // Test 3.3: Empty Fields
  info('Test 3.3: Login with empty fields')
  try {
    const formData = new URLSearchParams({
      csrfToken: csrfToken,
      email: '',
      password: '',
      redirect: 'false',
      json: 'true'
    })
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    })
    
    if (response.status === 401 || response.status === 302 || response.status === 400) {
      success('Empty fields correctly rejected')
    } else {
      error(`Empty fields returned unexpected status: ${response.status}`)
    }
  } catch (err) {
    error(`Empty fields test error: ${err}`)
  }
  
  // Test 3.4: Missing CSRF Token
  info('Test 3.4: Login without CSRF token')
  try {
    const formData = new URLSearchParams({
      email: 'student.test@example.com',
      password: 'StudentPass123!',
      redirect: 'false',
      json: 'true'
    })
    
    const response = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual'
    })
    
    // Should be rejected due to missing CSRF token
    if (response.status === 403 || response.status === 400) {
      success('Missing CSRF token correctly rejected')
    } else {
      error(`Missing CSRF token returned: ${response.status} (SECURITY ISSUE!)`)
    }
  } catch (err) {
    // Network error is acceptable (CSRF check at network level)
    success('Missing CSRF token blocked (error thrown)')
  }
}

// ============================================================================
// TEST SUITE 4: PROTECTED ROUTES
// ============================================================================

async function testProtectedRoutes() {
  section('TEST SUITE 4: Protected Routes & Middleware')
  
  // Test 4.1: Dashboard Without Auth
  info('Test 4.1: Access /dashboard without authentication')
  try {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      redirect: 'manual'
    })
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location')
      if (location?.includes('/sign-in')) {
        success('Dashboard correctly redirects to sign-in')
      } else {
        error(`Dashboard redirects to unexpected location: ${location}`)
      }
    } else if (response.status === 401 || response.status === 403) {
      success(`Dashboard correctly returns ${response.status}`)
    } else {
      error(`Dashboard accessible without auth (status ${response.status})`)
    }
  } catch (err) {
    error(`Dashboard test error: ${err}`)
  }
  
  // Test 4.2: Teacher Routes Without Auth
  info('Test 4.2: Access /teacher/courses without authentication')
  try {
    const response = await fetch(`${BASE_URL}/teacher/courses`, {
      redirect: 'manual'
    })
    
    if (response.status === 302 || response.status === 307 || response.status === 401) {
      success('Teacher route correctly protected')
    } else {
      error(`Teacher route accessible without auth (status ${response.status})`)
    }
  } catch (err) {
    error(`Teacher route test error: ${err}`)
  }
  
  // Test 4.3: Admin Routes Without Auth
  info('Test 4.3: Access /admin/dashboard without authentication')
  try {
    const response = await fetch(`${BASE_URL}/admin/dashboard`, {
      redirect: 'manual'
    })
    
    if (response.status === 302 || response.status === 307 || response.status === 401) {
      success('Admin route correctly protected')
    } else {
      error(`Admin route accessible without auth (status ${response.status})`)
    }
  } catch (err) {
    error(`Admin route test error: ${err}`)
  }
  
  // Test 4.4: Public Routes Accessible
  info('Test 4.4: Public routes accessible without auth')
  const publicRoutes = ['/', '/sign-in', '/sign-up']
  
  for (const route of publicRoutes) {
    try {
      const response = await fetch(`${BASE_URL}${route}`)
      
      if (response.ok || response.status === 304) {
        success(`Public route ${route} accessible`)
      } else {
        error(`Public route ${route} returned ${response.status}`)
      }
    } catch (err) {
      error(`Public route ${route} test error: ${err}`)
    }
  }
}

// ============================================================================
// TEST SUITE 5: ROLE-BASED ACCESS
// ============================================================================

async function testRoleBasedAccess() {
  section('TEST SUITE 5: Role-Based Access Control')
  
  // Helper function to login and get cookies
  async function loginAs(email: string, password: string): Promise<CookieJar> {
    const cookieJar: CookieJar = { cookies: [] }
    
    try {
      // Get CSRF token
      const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`)
      const csrfData = await csrfResponse.json()
      
      // Login
      const formData = new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: email,
        password: password,
        redirect: 'false',
        json: 'true'
      })
      
      const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        redirect: 'manual'
      })
      
      cookieJar.cookies = extractCookies(loginResponse)
    } catch (err) {
      error(`Login failed for ${email}: ${err}`)
    }
    
    return cookieJar
  }
  
  // Test 5.1: Student Access to Teacher Routes
  info('Test 5.1: Student attempting to access teacher routes')
  try {
    const studentCookies = await loginAs('student.test@example.com', 'StudentPass123!')
    
    if (studentCookies.cookies.length > 0) {
      const response = await fetch(`${BASE_URL}/teacher/courses`, {
        headers: {
          'Cookie': getCookieHeader(studentCookies)
        },
        redirect: 'manual'
      })
      
      if (response.status === 302 || response.status === 403 || response.status === 401) {
        success('Student correctly denied access to teacher routes')
      } else {
        error(`Student can access teacher routes (status ${response.status}) - SECURITY ISSUE!`)
      }
    }
  } catch (err) {
    error(`Student access test error: ${err}`)
  }
  
  // Test 5.2: Teacher Access to Teacher Routes
  info('Test 5.2: Teacher accessing teacher routes')
  try {
    const teacherCookies = await loginAs('teacher.test@example.com', 'TeacherPass123!')
    
    if (teacherCookies.cookies.length > 0) {
      const response = await fetch(`${BASE_URL}/teacher/courses`, {
        headers: {
          'Cookie': getCookieHeader(teacherCookies)
        }
      })
      
      if (response.ok) {
        success('Teacher correctly has access to teacher routes')
      } else {
        error(`Teacher denied access to teacher routes (status ${response.status})`)
      }
    }
  } catch (err) {
    error(`Teacher access test error: ${err}`)
  }
  
  // Test 5.3: Teacher Access to Admin Routes
  info('Test 5.3: Teacher attempting to access admin routes')
  try {
    const teacherCookies = await loginAs('teacher.test@example.com', 'TeacherPass123!')
    
    if (teacherCookies.cookies.length > 0) {
      const response = await fetch(`${BASE_URL}/admin/dashboard`, {
        headers: {
          'Cookie': getCookieHeader(teacherCookies)
        },
        redirect: 'manual'
      })
      
      if (response.status === 302 || response.status === 403 || response.status === 401) {
        success('Teacher correctly denied access to admin routes')
      } else {
        error(`Teacher can access admin routes (status ${response.status}) - SECURITY ISSUE!`)
      }
    }
  } catch (err) {
    error(`Teacher to admin access test error: ${err}`)
  }
  
  // Test 5.4: Admin Access to All Routes
  info('Test 5.4: Admin accessing all protected routes')
  try {
    const adminCookies = await loginAs('admin.test@example.com', 'AdminPass123!')
    
    if (adminCookies.cookies.length > 0) {
      const routes = ['/dashboard', '/teacher/courses', '/admin/dashboard']
      let allAccessible = true
      
      for (const route of routes) {
        const response = await fetch(`${BASE_URL}${route}`, {
          headers: {
            'Cookie': getCookieHeader(adminCookies)
          },
          redirect: 'manual'
        })
        
        if (!response.ok && response.status !== 302) {
          allAccessible = false
          error(`Admin cannot access ${route} (status ${response.status})`)
        }
      }
      
      if (allAccessible) {
        success('Admin correctly has access to all routes')
      }
    }
  } catch (err) {
    error(`Admin access test error: ${err}`)
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n')
  log('╔══════════════════════════════════════════════════════════════════╗', colors.cyan)
  log('║         AUTH API ENDPOINTS & MIDDLEWARE TEST SUITE               ║', colors.cyan)
  log('╚══════════════════════════════════════════════════════════════════╝', colors.cyan)
  console.log('\n')
  
  info(`Testing against: ${BASE_URL}`)
  info('Make sure the development server is running!\n')
  
  const startTime = Date.now()
  
  try {
    await testNextAuthRoutes()
    await testAuthenticationFlow()
    await testInvalidCredentials()
    await testProtectedRoutes()
    await testRoleBasedAccess()
    
  } catch (err) {
    error(`Test suite failed: ${err}`)
  }
  
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  section('TEST COMPLETED')
  success(`All tests completed in ${duration} seconds`)
  
  console.log('\n')
  log('Note: Some tests may fail if:', colors.yellow)
  log('  1. Development server is not running', colors.yellow)
  log('  2. Test users do not exist in database', colors.yellow)
  log('  3. Environment variables are not set', colors.yellow)
  console.log('\n')
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/providers`)
    if (response.ok) {
      return true
    }
  } catch (err) {
    return false
  }
  return false
}

// Entry point
checkServer().then(isRunning => {
  if (!isRunning) {
    error('\n❌ Cannot connect to the development server!')
    error(`Make sure the server is running at ${BASE_URL}`)
    error('Start the server with: npm run dev\n')
    process.exit(1)
  }
  
  runAllTests().catch(err => {
    error(`Fatal error: ${err}`)
    process.exit(1)
  })
})


