const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';

const SYSTEM_PROMPT = `You are Avana AI — a women's safety assistant built into the Avana safety app.

Your role:
- Help women in unsafe situations with CLEAR, CALM, ACTIONABLE advice
- Give safety tips, emergency guidance, escape routes, and legal steps
- Assist with app navigation (SOS, map, community, profile)
- Keep responses SHORT (4-5 lines max) and practical

Rules:
- Never ask for personal information
- Never give medical or legal advice — direct to professionals
- Always prioritize immediate physical safety
- If someone is in danger, tell them to call 112 or use the SOS button
- Be empathetic but action-oriented
- Use Indian emergency numbers (112, 181 Women Helpline, 100 Police)`;

router.post('/', async (req, res) => {
  console.log('\n========================================');
  console.log('[GEMINI] Chat request received');
  
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log('[GEMINI] Invalid message received');
      return res.status(400).json({ 
        success: false,
        error: 'Please enter a message.',
        reply: 'Please enter a message.'
      });
    }

    console.log('[GEMINI] User message:', message.substring(0, 100));

    if (!GEMINI_API_KEY) {
      console.error('[GEMINI] CRITICAL: GEMINI_API_KEY is not configured!');
      console.error('[GEMINI] Set GEMINI_API_KEY in your .env file');
      return res.status(500).json({
        success: false,
        error: 'API key not configured',
        reply: 'AI assistant is not configured. For immediate safety, call emergency services (112) or a trusted person.'
      });
    }

    if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
      console.error('[GEMINI] CRITICAL: GEMINI_API_KEY is still the placeholder value!');
      return res.status(500).json({
        success: false,
        error: 'API key is placeholder',
        reply: 'AI assistant is not configured. For immediate safety, call emergency services (112) or a trusted person.'
      });
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    console.log('[GEMINI] Using model:', GEMINI_MODEL);
    console.log('[GEMINI] API URL:', GEMINI_URL.replace(GEMINI_API_KEY, '***'));

    const contents = [];

    contents.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I am Avana AI, your safety assistant. How can I help you stay safe?' }]
    });

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === 'user' && msg.text) {
          contents.push({ role: 'user', parts: [{ text: msg.text }] });
        } else if (msg.role === 'assistant' && msg.text) {
          contents.push({ role: 'model', parts: [{ text: msg.text }] });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message.trim() }] });

    console.log('[GEMINI] Sending request to Gemini API...');
    const startTime = Date.now();

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });

    const elapsed = Date.now() - startTime;
    console.log('[GEMINI] Response received in', elapsed, 'ms');
    console.log('[GEMINI] Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[GEMINI] API Error Response:', response.status, errorBody);
      
      if (response.status === 400) {
        console.error('[GEMINI] Bad request - check model name and parameters');
      } else if (response.status === 401) {
        console.error('[GEMINI] Unauthorized - API key is invalid');
      } else if (response.status === 403) {
        console.error('[GEMINI] Forbidden - API key may be restricted');
      } else if (response.status === 429) {
        console.error('[GEMINI] Rate limited - Quota exceeded');
      }
      
      return res.status(502).json({
        success: false,
        error: `API error: ${response.status}`,
        reply: 'Sorry, I couldn\'t respond right now. For immediate help, call 112 or use the SOS button.'
      });
    }

    const data = await response.json();
    console.log('[GEMINI] Full response:', JSON.stringify(data, null, 2).substring(0, 500));

    if (data.error) {
      console.error('[GEMINI] Gemini API returned error:', data.error);
      return res.status(502).json({
        success: false,
        error: data.error.message || 'API error',
        reply: 'Sorry, I couldn\'t respond right now. For immediate help, call 112.'
      });
    }

    const candidate = data.candidates?.[0];
    
    if (!candidate) {
      console.error('[GEMINI] No candidates in response');
      console.error('[GEMINI] Full response:', JSON.stringify(data, null, 2));
      
      if (data.promptFeedback?.blockReason) {
        console.error('[GEMINI] Content was blocked:', data.promptFeedback.blockReason);
        return res.status(400).json({
          success: false,
          error: 'Content blocked by safety filter',
          reply: 'I\'m unable to respond to that. Please try a different question or call 112 for immediate help.'
        });
      }
      
      return res.status(502).json({
        success: false,
        error: 'No response generated',
        reply: 'I couldn\'t generate a response. Please try again, or call 112 for immediate help.'
      });
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      console.warn('[GEMINI] Unusual finish reason:', candidate.finishReason);
    }

    const aiText = candidate.content?.parts?.[0]?.text;

    if (!aiText) {
      console.error('[GEMINI] No text in response parts');
      console.error('[GEMINI] Candidate:', JSON.stringify(candidate, null, 2));
      return res.status(502).json({
        success: false,
        error: 'Empty response',
        reply: 'I couldn\'t generate a response. Please try again, or call 112 for immediate help.'
      });
    }

    console.log('[GEMINI] Success! Response:', aiText.substring(0, 100) + '...');
    console.log('========================================\n');

    return res.json({ 
      success: true,
      reply: aiText.trim() 
    });

  } catch (err) {
    console.error('[GEMINI] Exception:', err);
    console.error('[GEMINI] Error name:', err.name);
    console.error('[GEMINI] Error message:', err.message);

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        reply: 'Response took too long. Please try again.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message,
      reply: 'Sorry, I couldn\'t respond. Try again or call emergency services (112).'
    });
  }
});

router.get('/test', async (req, res) => {
  console.log('\n========================================');
  console.log('[GEMINI] Test endpoint called');
  
  const result = {
    apiKeyConfigured: !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key-here',
    apiKeyPreview: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    model: GEMINI_MODEL,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  };

  console.log('[GEMINI] Config:', result);
  console.log('========================================\n');

  if (!result.apiKeyConfigured) {
    return res.status(500).json({
      success: false,
      error: 'GEMINI_API_KEY not configured',
      ...result
    });
  }

  try {
    const testMessage = 'Say "Hello, Avana is working!" in one short sentence.';
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: testMessage }] }],
          generationConfig: { maxOutputTokens: 100 }
        }),
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI] Test failed:', response.status, errorText);
      return res.status(response.status).json({
        success: false,
        error: `API test failed: ${response.status}`,
        details: errorText,
        ...result
      });
    }

    const data = await response.json();
    const testResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!testResponse) {
      return res.status(500).json({
        success: false,
        error: 'No response from API',
        fullResponse: data,
        ...result
      });
    }

    console.log('[GEMINI] Test SUCCESS:', testResponse);
    console.log('========================================\n');

    return res.json({
      success: true,
      testMessage,
      testResponse,
      ...result
    });

  } catch (err) {
    console.error('[GEMINI] Test exception:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      ...result
    });
  }
});

module.exports = router;
