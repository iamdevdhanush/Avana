import React, { useState, useEffect, useRef, useCallback } from 'react';
import { saveEvidence, getEvidence, saveSafetyEvent, getSafetyAnalytics, uploadEvidence } from '../services/supabase';
import './SafetyScreen.css';

const SITUATIONS = [
  { id: 'stalking', label: 'Stalking', icon: '👁️', risk: 'HIGH', color: '#FF3D00', tips: ['Cross the street immediately', 'Enter any public building', 'Call someone you trust', 'Share live location'], extra: 'Do not confront the stalker. Stay visible and populated.' },
  { id: 'harassment', label: 'Harassment', icon: '⚠️', risk: 'HIGH', color: '#FF9100', tips: ['Remove yourself from situation', 'Loudly say "NO" firmly', 'Document if safe to do so', 'Call emergency if escalating'], extra: 'Trust your instincts. You deserve to feel safe.' },
  { id: 'physical', label: 'Physical Threat', icon: '🚨', risk: 'CRITICAL', color: '#FF3D00', tips: ['Run to nearest public area', 'Scream for help loudly', 'Use any defensive tool', 'Trigger SOS immediately'], extra: 'Your safety is the priority. Escape first, everything else later.' },
  { id: 'transport', label: 'Unsafe Transport', icon: '🚗', risk: 'MEDIUM', color: '#FFD600', tips: ['Exit the vehicle', 'Move to well-lit area', 'Call a friend or cab', 'Share location'], extra: 'If in a ride-share, check license plate before entering.' },
  { id: 'blackmail', label: 'Online Blackmail', icon: '💻', risk: 'LOW', color: '#00C853', tips: ['Do not comply with demands', 'Screenshot all communications', 'Block and report', 'Seek legal help'], extra: 'You are not alone. This is not your fault.' }
];

const LEGAL_STEPS = [
  { title: 'File FIR', desc: 'Visit nearest police station or file online at cybercrime.gov.in' },
  { title: 'Preserve Evidence', desc: 'Screenshots, messages, recordings - do not delete anything' },
  { title: 'Legal Aid', desc: 'Contact NCW (181) or local women helpline for free legal support' },
  { title: 'Protection Order', desc: 'You can seek restraining order from court' }
];

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export function SafetyScreen({ onSOS, user }) {
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [evidence, setEvidence] = useState({ notes: '', file: null, location: '' });
  const [savedEvidence, setSavedEvidence] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: 'I am your AI safety assistant. How can I help you stay safe right now?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const situation = SITUATIONS.find(s => s.id === selectedSituation);

  const loadEvidence = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await getEvidence(user.id);
    if (data) setSavedEvidence(data);
  }, [user?.id]);

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await getSafetyAnalytics(user.id);
    if (data) setAnalytics(data);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadEvidence();
      loadAnalytics();
    }
  }, [user, loadEvidence, loadAnalytics]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const link = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          if (navigator.share) {
            navigator.share({ text: `My location: ${link}` });
          } else {
            navigator.clipboard.writeText(link);
            alert('Location copied to clipboard!');
          }
        },
        () => alert('Could not get location')
      );
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidence(prev => ({ ...prev, file }));
    }
  };

  const handleSaveEvidence = async () => {
    if (!user?.id) {
      alert('Please sign in to save evidence');
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      
      if (evidence.file) {
        fileUrl = await uploadEvidence(evidence.file, user.id);
      }

      let locationStr = 'Unknown';
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          locationStr = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        } catch {}
      }

      const evidenceData = {
        userId: user.id,
        fileUrl,
        notes: evidence.notes,
        location: locationStr
      };

      const { error } = await saveEvidence(evidenceData);
      
      if (error) throw error;

      if (selectedSituation && situation) {
        const eventData = {
          userId: user.id,
          lat: locationStr.split(',')[0]?.trim() || 0,
          lng: locationStr.split(',')[1]?.trim() || 0,
          riskLevel: situation.risk,
          eventType: 'evidence_captured',
          description: `Evidence captured for: ${situation.label}`
        };
        await saveSafetyEvent(eventData);
      }

      await loadEvidence();
      await loadAnalytics();
      
      setEvidence({ notes: '', file: null, location: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      alert('Evidence saved securely to cloud!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save evidence. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const sendToGemini = async (message) => {
    setChatLoading(true);
    
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        })
      });
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I understand this is difficult. Please stay calm and focus on your immediate safety.';
    } catch {
      return 'I am here to help. For immediate safety, please call emergency services (112) or a trusted person. You are not alone.';
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    
    const systemPrompt = 'You are an AI safety assistant for Avana. Help women in unsafe situations with SHORT (4-5 lines max), CLEAR, CALM, ACTIONABLE advice. Focus on immediate safety, escape routes, and legal steps. Never ask for personal info. Keep responses brief and helpful.';
    const aiResponse = await sendToGemini(`${systemPrompt}\n\nUser: ${chatInput}`);
    
    setChatMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
  };

  const toggleSection = (id) => setExpandedSection(expandedSection === id ? null : id);

  return (
    <div className="safety-screen">
      <header className="safety-header">
        <h1>Safety Center</h1>
        <p>AI-Powered Protection</p>
      </header>

      <div className="safety-content">
        {analytics && (
          <div className="analytics-bar">
            <div className="analytics-item">
              <span className="analytics-value">{analytics.total}</span>
              <span className="analytics-label">Events (30d)</span>
            </div>
            <div className="analytics-item high">
              <span className="analytics-value">{analytics.highRisk}</span>
              <span className="analytics-label">High Risk</span>
            </div>
          </div>
        )}

        {selectedSituation && situation && (
          <div className="situation-context" style={{ borderColor: situation.color }}>
            <div className="context-badge" style={{ background: `${situation.color}20`, color: situation.color }}>
              <span>{situation.icon}</span>
              Situation: {situation.label}
            </div>
            <div className="context-risk">
              <span className="risk-label">Risk Level:</span>
              <span className="risk-value" style={{ color: situation.color }}>{situation.risk}</span>
            </div>
            <p className="context-recommendation">{situation.extra}</p>
          </div>
        )}

        <div className="immediate-action">
          <div className="action-title">
            <span>⚠️</span> Immediate Action
          </div>
          <div className="action-steps">
            <div className="step">1. Move to safe/public area</div>
            <div className="step">2. Call for help</div>
            <div className="step">3. Trigger SOS</div>
          </div>
          <div className="action-buttons">
            <button className="sos-btn" onClick={onSOS}>
              <span className="sos-glow"></span>
              🚨 SOS
            </button>
            <button className="share-btn" onClick={handleShareLocation}>
              📍 Share Location
            </button>
          </div>
        </div>

        <div className="section situation-selector">
          <div className="section-header" onClick={() => toggleSection('situations')}>
            <span>🚨</span> Select Situation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'situations' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"}/>
            </svg>
          </div>
          {expandedSection === 'situations' && (
            <div className="situation-grid">
              {SITUATIONS.map(s => (
                <button
                  key={s.id}
                  className={`situation-chip ${selectedSituation === s.id ? 'active' : ''}`}
                  style={selectedSituation === s.id ? { borderColor: s.color, background: `${s.color}15` } : {}}
                  onClick={() => setSelectedSituation(s.id)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSituation && situation && (
          <div className="section">
            <div className="section-header" onClick={() => toggleSection('tips')}>
              <span>🛡️</span> Safety Tips
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points={expandedSection === 'tips' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"}/>
              </svg>
            </div>
            {expandedSection !== 'tips' && (
              <div className="tips-preview">
                {situation.tips.slice(0, 2).map((tip, i) => <span key={i}>{tip}</span>)}
                <button className="expand-hint" onClick={() => setExpandedSection('tips')}>Show all</button>
              </div>
            )}
            {expandedSection === 'tips' && (
              <div className="tips-list">
                {situation.tips.map((tip, i) => (
                  <div key={i} className="tip-item">
                    <span className="tip-num">{i + 1}</span>
                    <span>{tip}</span>
                  </div>
                ))}
                {situation.risk === 'CRITICAL' && (
                  <div className="emergency-guide">
                    <strong>Emergency Physical Safety Guide:</strong>
                    <p>Run if possible. If cornered, target eyes/throat. Make noise. Do not give up.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="section">
          <div className="section-header" onClick={() => toggleSection('evidence')}>
            <span>📁</span> Save Evidence
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'evidence' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"}/>
            </svg>
          </div>
          {expandedSection === 'evidence' && (
            <div className="evidence-form">
              <div className="form-row">
                <input 
                  type="file" 
                  id="evidence-file" 
                  className="file-input" 
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <label htmlFor="evidence-file" className="file-label">
                  📎 {evidence.file ? evidence.file.name : 'Attach Screenshot/Video'}
                </label>
              </div>
              <textarea
                placeholder="Quick notes about what happened..."
                value={evidence.notes}
                onChange={e => setEvidence({...evidence, notes: e.target.value})}
                rows="3"
              />
              <div className="form-meta">
                <span>⏰ {new Date().toLocaleTimeString()}</span>
                <span>📍 Auto-capture location on save</span>
              </div>
              <button className="save-btn" onClick={handleSaveEvidence} disabled={uploading}>
                {uploading ? 'Saving...' : 'Save Evidence'}
              </button>
              {savedEvidence.length > 0 && (
                <div className="saved-list">
                  <h4>Recent Evidence ({savedEvidence.length})</h4>
                  {savedEvidence.slice(0, 3).map(ev => (
                    <div key={ev.id} className="saved-item">
                      <span>📎</span>
                      <div>
                        <p>{ev.notes?.substring(0, 50) || 'No notes'}</p>
                        <small>{new Date(ev.timestamp).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-header" onClick={() => toggleSection('legal')}>
            <span>⚖️</span> Next Steps
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'legal' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"}/>
            </svg>
          </div>
          {expandedSection === 'legal' && (
            <div className="legal-list">
              {LEGAL_STEPS.map((step, i) => (
                <div key={i} className="legal-item">
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              ))}
              <div className="helpline">📞 Women Helpline: <a href="tel:181">181</a> | Police: <a href="tel:100">100</a></div>
            </div>
          )}
        </div>

        <div className="bottom-spacer"></div>
      </div>

      <button className="chat-fab" onClick={() => setChatOpen(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {chatOpen && (
        <div className="chat-drawer">
          <div className="chat-header">
            <div className="chat-title">
              <span>🤖</span> AI Safety Assistant
            </div>
            <button className="chat-close" onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                {msg.text}
              </div>
            ))}
            {chatLoading && <div className="chat-msg assistant loading">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="Ask for safety advice..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChatSend()}
            />
            <button onClick={handleChatSend} disabled={chatLoading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
