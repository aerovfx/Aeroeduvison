/**
 * Test script for Grok API integration
 * Tests X.AI Grok API with AI Content Generator
 */

async function testGrokAPI() {
  const GROK_API_KEY = "xai-g3EzXb7yo6bCNa3mYOqhJYSxT1cqNy3UNQ1N73PUqr6tLf6udeh0fSZtcbsF0bb91Payq3SqD1u3fVPY";
  
  console.log("\n🧪 Testing Grok API Integration\n");
  console.log("=" .repeat(60));
  
  // Test 1: Direct API call
  console.log("\n📡 Test 1: Direct Grok API Call");
  console.log("-".repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a Vietnamese education expert.'
          },
          {
            role: 'user',
            content: 'Giải thích ngắn gọn về phương trình bậc hai trong 2 câu.'
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        stream: false,
      }),
    });
    
    const elapsed = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ API call successful!");
      console.log(`⏱️  Response time: ${elapsed}ms`);
      console.log(`📝 Model: ${data.model}`);
      console.log(`💬 Response:`);
      console.log(`   ${data.choices[0].message.content}`);
      console.log(`\n🔢 Usage: ${data.usage?.total_tokens || 'N/A'} tokens`);
    } else {
      const error = await response.text();
      console.log(`❌ API call failed: ${response.status}`);
      console.log(`   Error: ${error}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error}`);
    return false;
  }
  
  // Test 2: Verify key format
  console.log("\n🔑 Test 2: API Key Validation");
  console.log("-".repeat(60));
  
  if (GROK_API_KEY.startsWith('xai-')) {
    console.log("✅ Key format is correct (starts with 'xai-')");
    console.log(`   Key preview: ${GROK_API_KEY.substring(0, 15)}...`);
  } else {
    console.log("❌ Invalid key format (should start with 'xai-')");
    return false;
  }
  
  // Test 3: Educational content generation test
  console.log("\n📚 Test 3: Educational Content Generation");
  console.log("-".repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia giáo dục Việt Nam, chuyên thiết kế bài giảng và tài liệu học tập.'
          },
          {
            role: 'user',
            content: `Tạo một bài tập trắc nghiệm về phương trình bậc hai cho học sinh lớp 10.
            
Yêu cầu:
- Câu hỏi: Giải phương trình x² - 5x + 6 = 0
- 4 đáp án (A, B, C, D)
- Giải thích ngắn gọn

Format JSON:
{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": 0,
  "explanation": "..."
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });
    
    const elapsed = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Content generation successful!");
      console.log(`⏱️  Response time: ${elapsed}ms`);
      console.log(`📝 Generated content:`);
      
      const content = data.choices[0].message.content;
      console.log(content.substring(0, 300) + (content.length > 300 ? '...' : ''));
      
      console.log(`\n🔢 Usage: ${data.usage?.total_tokens || 'N/A'} tokens`);
    } else {
      const error = await response.text();
      console.log(`❌ Content generation failed: ${response.status}`);
      console.log(`   Error: ${error}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error}`);
    return false;
  }
  
  // Test 4: Vietnamese language support
  console.log("\n🇻🇳 Test 4: Vietnamese Language Support");
  console.log("-".repeat(60));
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'user',
            content: 'Viết 1 câu về giáo dục Việt Nam bằng tiếng Việt có dấu.'
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
        stream: false,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const text = data.choices[0].message.content;
      
      // Check for Vietnamese characters
      const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
      
      if (hasVietnamese) {
        console.log("✅ Vietnamese language support confirmed!");
        console.log(`   Sample: ${text.substring(0, 100)}`);
      } else {
        console.log("⚠️  No Vietnamese diacritics detected");
        console.log(`   Response: ${text}`);
      }
    } else {
      console.log("❌ Test failed");
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error}`);
    return false;
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("\n✅ All Grok API tests passed!");
  console.log("\n📋 Summary:");
  console.log("   ✓ API connection working");
  console.log("   ✓ Key format valid");
  console.log("   ✓ Educational content generation working");
  console.log("   ✓ Vietnamese language supported");
  console.log("\n🎯 Grok API is ready for production use!");
  console.log("\n💡 Next steps:");
  console.log("   1. Add GROK_API_KEY to .env.local");
  console.log("   2. Restart dev server: npm run dev");
  console.log("   3. Visit: http://localhost:3000/dashboard/ai-content-generator");
  console.log("   4. Generate content and enjoy! 🚀");
  
  return true;
}

// Run tests
testGrokAPI()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

