const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const GeminiDebug = {
  async checkBackendHealth() {
    console.log('🔍 Checking backend health...');
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      console.log('✅ Backend healthy:', data);
      return { success: true, data };
    } catch (err) {
      console.error('❌ Backend unreachable:', err);
      return { success: false, error: err.message };
    }
  },

  async testChatEndpoint() {
    console.log('🔍 Testing /api/chat endpoint...');
    try {
      const response = await fetch(`${API_URL}/api/chat/test`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      const data = await response.json();
      console.log('📊 Chat test result:', data);
      return data;
    } catch (err) {
      console.error('❌ Chat test failed:', err);
      return { success: false, error: err.message };
    }
  },

  async sendTestMessage(message = 'Hello, test message') {
    console.log('🔍 Sending test message:', message);
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          history: []
        }),
        signal: AbortSignal.timeout(20000)
      });
      
      console.log('📊 Status:', response.status);
      
      if (!response.ok) {
        console.error('❌ API error:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error details:', errorData);
        return { success: false, error: errorData.error || `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      console.log('✅ Response:', data);
      return data;
      
    } catch (err) {
      console.error('❌ Request failed:', err);
      console.error('❌ Error type:', err.name);
      return { success: false, error: err.message };
    }
  },

  async runFullDebug() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           GEMINI API FRONTEND DEBUG                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    console.log('CONFIG:');
    console.log('  API_URL:', API_URL);
    console.log('  CHAT_URL:', `${API_URL}/api/chat`);
    console.log('');

    console.log('TEST 1: Backend Health');
    console.log('─'.repeat(60));
    const health = await this.checkBackendHealth();
    if (!health.success) {
      console.log('❌ FAIL: Cannot reach backend');
      console.log('   → Start backend server: npm start (in backend folder)');
      console.log('   → Check REACT_APP_API_URL in .env');
      return;
    }
    console.log('');

    console.log('TEST 2: Chat Endpoint Config');
    console.log('─'.repeat(60));
    const config = await this.testChatEndpoint();
    if (!config.success) {
      if (config.error?.includes('API key')) {
        console.log('❌ FAIL: Gemini API key not configured on backend');
        console.log('   → Set GEMINI_API_KEY in backend/.env');
        return;
      }
      console.log('❌ FAIL: Chat endpoint error');
      return;
    }
    
    console.log('   API Key:', config.apiKeyConfigured ? '✅ Configured' : '❌ Not set');
    console.log('   Model:', config.model);
    console.log('');

    console.log('TEST 3: Send Message');
    console.log('─'.repeat(60));
    const result = await this.sendTestMessage('Say "Frontend test successful" in exactly those words');
    
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log('   AI Response:', result.reply);
    } else {
      console.log('❌ FAIL:', result.error);
    }

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    DEBUG COMPLETE                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
  }
};

window.GeminiDebug = GeminiDebug;
