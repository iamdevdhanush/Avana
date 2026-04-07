const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ reply: 'Please enter a message.' });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return res.status(500).json({
        reply: 'AI assistant is not configured. For immediate safety, call emergency services (112) or a trusted person.'
      });
    }

    // Build conversation contents with system prompt + history + new message
    const contents = [];

    // System instruction as first user turn
    contents.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I am Avana AI, your safety assistant. How can I help you stay safe?' }]
    });

    // Include conversation history (last 10 messages for context)
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

    // Add current user message
    contents.push({ role: 'user', parts: [{ text: message.trim() }] });

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
          topP: 0.9,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`Gemini API error: ${response.status}`, errorBody);
      return res.status(502).json({
        reply: 'Sorry, I couldn\'t respond right now. For immediate help, call 112 or use the SOS button.'
      });
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(502).json({
        reply: 'I couldn\'t generate a response. Please try again, or call 112 for immediate help.'
      });
    }

    return res.json({ reply: aiText.trim() });

  } catch (err) {
    console.error('Chat endpoint error:', err);

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({
        reply: 'Response took too long. Please try again.'
      });
    }

    return res.status(500).json({
      reply: 'Sorry, I couldn\'t respond. Try again or call emergency services (112).'
    });
  }
});

module.exports = router;
