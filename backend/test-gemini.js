require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           GEMINI API DEBUG TEST                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');

async function runTests() {
  console.log('TEST 1: Environment Variables');
  console.log('─'.repeat(60));
  
  if (!GEMINI_API_KEY) {
    console.log('❌ FAIL: GEMINI_API_KEY is not set');
    console.log('   Add GEMINI_API_KEY=your-key to .env file');
    return;
  }
  
  if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
    console.log('❌ FAIL: GEMINI_API_KEY is still the placeholder');
    console.log('   Replace your-gemini-api-key-here with your actual key');
    return;
  }
  
  console.log('✅ PASS: GEMINI_API_KEY is set');
  console.log('   Preview:', GEMINI_API_KEY.substring(0, 10) + '...');
  console.log('');

  console.log('TEST 2: API Connection');
  console.log('─'.repeat(60));
  
  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say "API is working!" in exactly those words.' }] }],
        generationConfig: { maxOutputTokens: 50 }
      }),
      signal: AbortSignal.timeout(15000)
    });
    
    console.log('   Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ FAIL: API returned error');
      console.log('   Error:', errorText);
      
      if (response.status === 400) {
        console.log('   → Invalid request format');
      } else if (response.status === 401) {
        console.log('   → API key is invalid');
      } else if (response.status === 403) {
        console.log('   → API key is forbidden/restricted');
      } else if (response.status === 404) {
        console.log('   → Model not found - check model name');
      } else if (response.status === 429) {
        console.log('   → Rate limited - quota exceeded');
      }
      return;
    }
    
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 300));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.log('❌ FAIL: No text in response');
      console.log('   Full response:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('');
    console.log('✅ PASS: API is working!');
    console.log('   Response:', text);
    console.log('');
    
  } catch (err) {
    console.log('❌ FAIL: Request failed');
    console.log('   Error:', err.message);
    console.log('   Name:', err.name);
    
    if (err.name === 'TimeoutError') {
      console.log('   → Request timed out - check internet connection');
    } else if (err.message?.includes('fetch')) {
      console.log('   → Cannot reach API - check network/firewall');
    }
    return;
  }

  console.log('');
  console.log('TEST 3: Full Request Format');
  console.log('─'.repeat(60));
  
  const fullRequest = {
    contents: [
      { role: 'user', parts: [{ text: 'You are Avana AI. Say hello in 3 words.' }] }
    ],
    generationConfig: {
      maxOutputTokens: 50,
      temperature: 0.7
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  };
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullRequest),
      signal: AbortSignal.timeout(15000)
    });
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log('✅ PASS: Full format works');
    console.log('   Response:', text);
    
  } catch (err) {
    console.log('❌ FAIL:', err.message);
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    ALL TESTS COMPLETE                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
}

runTests().catch(console.error);
