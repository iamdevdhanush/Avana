require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
app.use(express.json());
app.use(cors());

// ============================================
// SUPABASE CLIENT
// ============================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================
// OPENAI CLIENT
// ============================================
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ============================================
// AI CLASSIFICATION PROMPT
// ============================================
const CLASSIFICATION_PROMPT = `Analyze this safety report and return ONLY valid JSON with no additional text.
Response MUST be valid JSON matching this exact format:
{
    "category": "(crime | suspicious | infrastructure | emergency | other)",
    "severity": "(low | medium | high)",
    "summary": "short 1-line summary of the incident"
}

Rules:
- category: crime (criminal activity), suspicious (unusual behavior), infrastructure (road/utility issues), emergency (immediate danger), other
- severity: low (minor), medium (concerning), high (urgent/dangerous)
- summary: Maximum 15 words, factual and concise

Report: `;

// ============================================
// AI CLASSIFICATION FUNCTION
// ============================================
async function classifyReport(userInput) {
    console.log('[AI] Starting classification for input:', userInput.substring(0, 50) + '...');
    
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a safety report classification AI. Always return valid JSON only.'
                },
                {
                    role: 'user',
                    content: CLASSIFICATION_PROMPT + userInput
                }
            ],
            temperature: 0.3,
            max_tokens: 150
        });

        const rawResponse = completion.choices[0].message.content.trim();
        console.log('[AI] Raw response:', rawResponse);

        // Clean response - remove markdown code blocks if present
        let jsonStr = rawResponse;
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        
        // Validate required fields
        if (!parsed.category || !parsed.severity || !parsed.summary) {
            throw new Error('Invalid AI response: missing required fields');
        }

        const validCategories = ['crime', 'suspicious', 'infrastructure', 'emergency', 'other'];
        const validSeverities = ['low', 'medium', 'high'];

        if (!validCategories.includes(parsed.category)) {
            parsed.category = 'other';
        }
        if (!validSeverities.includes(parsed.severity)) {
            parsed.severity = 'low';
        }

        console.log('[AI] Classification successful:', parsed);
        return parsed;

    } catch (error) {
        console.error('[AI] Classification error:', error.message);
        throw error;
    }
}

// ============================================
// API ROUTE: POST /api/analyze-report
// ============================================
app.post('/api/analyze-report', async (req, res) => {
    const startTime = Date.now();
    console.log('\n========================================');
    console.log('[API] Received analyze-report request');
    console.log('[API] Timestamp:', new Date().toISOString());

    try {
        const { text } = req.body;

        // 1. Validate input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            console.log('[API] Validation failed: Empty or invalid text');
            return res.status(400).json({
                success: false,
                error: 'Report text is required'
            });
        }

        const trimmedText = text.trim();
        console.log('[API] Input text length:', trimmedText.length);

        // 2. Classify with AI
        console.log('[API] Step 1: Sending to AI...');
        const classification = await classifyReport(trimmedText);

        // 3. Insert into Supabase
        console.log('[API] Step 2: Inserting into Supabase...');
        const { data, error: dbError } = await supabase
            .from('reports')
            .insert({
                text: trimmedText,
                category: classification.category,
                severity: classification.severity,
                summary: classification.summary
            })
            .select()
            .single();

        if (dbError) {
            console.error('[DB] Insert error:', dbError);
            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log('[DB] Insert successful, ID:', data.id);

        // 4. Return success response
        const processingTime = Date.now() - startTime;
        console.log('[API] Total processing time:', processingTime, 'ms');
        console.log('========================================\n');

        return res.status(201).json({
            success: true,
            data: {
                id: data.id,
                text: data.text,
                category: data.category,
                severity: data.severity,
                summary: data.summary,
                created_at: data.created_at
            },
            processingTime: `${processingTime}ms`
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('[API] Error:', error.message);
        console.log('[API] Processing time before error:', processingTime, 'ms');
        console.log('========================================\n');

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// ============================================
// API ROUTE: GET /api/reports
// ============================================
app.get('/api/reports', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.error('[DB] Fetch error:', error);
            throw error;
        }

        return res.json({
            success: true,
            data,
            count: data.length
        });

    } catch (error) {
        console.error('[API] Error fetching reports:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        supabase: process.env.SUPABASE_URL ? 'configured' : 'missing',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 Incident Intelligence API running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Analyze endpoint: POST http://localhost:${PORT}/api/analyze-report`);
});

module.exports = app;
