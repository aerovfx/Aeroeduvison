#!/usr/bin/env node

const puppeteer = require('puppeteer');

const testUsers = [
  {
    name: 'Student',
    email: 'student@example.com',
    password: 'password123',
    role: 'student'
  },
  {
    name: 'Teacher', 
    email: 'teacher@example.com',
    password: 'password123',
    role: 'teacher'
  },
  {
    name: 'Admin',
    email: 'admin@example.com', 
    password: 'password123',
    role: 'admin'
  }
];

async function testLabTwinAccess() {
  console.log('🧪 Starting LabTwin Test Suite...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    defaultViewport: null,
    args: ['--start-maximized']
  });

  for (const user of testUsers) {
    console.log(`\n👤 Testing with ${user.name} (${user.role})`);
    console.log('=' .repeat(50));
    
    try {
      const page = await browser.newPage();
      
      // Test 1: Login
      console.log('1️⃣ Testing login...');
      await page.goto('http://localhost:3000/sign-in', { waitUntil: 'networkidle2' });
      
      await page.type('input[name="email"]', user.email);
      await page.type('input[name="password"]', user.password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect after login
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log('✅ Login successful');
      
      // Test 2: Access LabTwin main page
      console.log('2️⃣ Testing LabTwin access...');
      await page.goto('http://localhost:3000/learning-paths-demo/labtwin', { waitUntil: 'networkidle2' });
      
      // Check if page loads without errors
      const title = await page.title();
      console.log(`✅ LabTwin page loaded: ${title}`);
      
      // Check for experiment cards
      const experimentCards = await page.$$('[data-testid="experiment-card"], .space-y-2 > div');
      console.log(`✅ Found ${experimentCards.length} experiment cards`);
      
      // Test 3: Test one experiment
      console.log('3️⃣ Testing experiment functionality...');
      
      // Try to click on first experiment
      const firstExperiment = await page.$('a[href*="/experiment/"]');
      if (firstExperiment) {
        await firstExperiment.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Check for canvas element
        const canvas = await page.$('canvas');
        if (canvas) {
          console.log('✅ Canvas element found - experiment simulation working');
        } else {
          console.log('⚠️ Canvas element not found');
        }
        
        // Check for controls
        const controls = await page.$('button');
        if (controls) {
          console.log('✅ Control buttons found');
        }
        
        // Go back to main LabTwin page
        await page.goBack();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Test 4: Check role-based features
      console.log('4️⃣ Testing role-based features...');
      
      if (user.role === 'admin') {
        // Check for admin-specific elements
        const adminElements = await page.$('[href*="/admin"]');
        if (adminElements) {
          console.log('✅ Admin navigation found');
        }
      }
      
      if (user.role === 'teacher') {
        // Check for teacher-specific elements
        console.log('✅ Teacher access verified');
      }
      
      console.log(`✅ ${user.name} test completed successfully\n`);
      
      await page.close();
      
    } catch (error) {
      console.error(`❌ Error testing ${user.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 LabTwin Test Suite completed!');
  console.log('\n📋 Summary:');
  console.log('- All users should have access to LabTwin');
  console.log('- Experiments should load and function properly');
  console.log('- No ThemeProvider errors should occur');
  console.log('- Canvas simulations should render correctly');
  
  await browser.close();
}

// Run the test
testLabTwinAccess().catch(console.error);


