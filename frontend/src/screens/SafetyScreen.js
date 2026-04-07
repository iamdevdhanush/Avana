import React, { useState, useEffect, useRef } from 'react';
import { getEmergencyContacts, saveEmergencyContact, deleteEmergencyContact } from '../services/supabase';
import { getLocationLink, getGoogleMapsDirectionsUrl, searchNearbyPlaces, createWhatsAppMessage } from '../services/locationService';
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

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_URL = GEMINI_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
  : null;

export function SafetyScreen({ onSOS, user }) {
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [evidence, setEvidence] = useState({ notes: '', file: null });
  const [savedEvidence, setSavedEvidence] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: 'I am your AI safety assistant. How can I help you stay safe right now?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [callContact, setCallContact] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState({ police: [], hospital: [], women: [] });
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const situation = SITUATIONS.find(s => s.id === selectedSituation);

  useEffect(() => {
    const saved = localStorage.getItem('avana_evidence');
    if (saved) setSavedEvidence(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (user?.id) {
      loadEmergencyContacts();
      getCurrentLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          loadNearbyPlaces(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => console.warn('Location error:', err)
      );
    }
  };

  const loadEmergencyContacts = async () => {
    if (!user?.id) return;
    setLoadingContacts(true);
    try {
      const { data } = await getEmergencyContacts(user.id);
      setEmergencyContacts(data || []);
    } catch (err) {
      console.error('Load contacts error:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadNearbyPlaces = async (lat, lng) => {
    setLoadingPlaces(true);
    try {
      const [police, hospital, women] = await Promise.all([
        searchNearbyPlaces(lat, lng, 'police'),
        searchNearbyPlaces(lat, lng, 'hospital'),
        searchNearbyPlaces(lat, lng, 'women')
      ]);
      setNearbyPlaces({ police: police.slice(0, 5), hospital: hospital.slice(0, 5), women: women.slice(0, 5) });
    } catch (err) {
      console.error('Load places error:', err);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    try {
      await saveEmergencyContact({
        userId: user.id,
        name: newContact.name,
        phone: newContact.phone,
        relationship: newContact.relationship || 'Emergency Contact'
      });
      setNewContact({ name: '', phone: '', relationship: '' });
      loadEmergencyContacts();
    } catch (err) {
      console.error('Add contact error:', err);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await deleteEmergencyContact(contactId);
      loadEmergencyContacts();
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  };

  const handleCallEmergency = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSimulateCall = (contact) => {
    setCallContact(contact);
    setCallStatus('calling');
    setShowCallModal(true);

    setTimeout(() => {
      setCallStatus('connected');
    }, 2000);

    setTimeout(() => {
      setCallStatus('ended');
      setTimeout(() => {
        setShowCallModal(false);
        setCallStatus('idle');
        setCallContact(null);
      }, 1000);
    }, 8000);
  };

  const handleSOSClick = () => {
    if (onSOS) onSOS();
  };

  const handleWhatsAppSOS = async () => {
    if (!navigator.geolocation) {
      alert('Location not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const userName = user?.name || 'Avana User';

        if (emergencyContacts.length > 0) {
          const firstContact = emergencyContacts[0];
          const phone = firstContact.phone.replace(/\D/g, '');
          const message = createWhatsAppMessage(userName, lat, lng);
          window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        } else {
          const message = createWhatsAppMessage(userName, lat, lng);
          alert(`No emergency contacts. Message:\n\n${decodeURIComponent(message)}`);
        }
      },
      (err) => alert('Could not get location')
    );
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const link = getLocationLink(pos.coords.latitude, pos.coords.longitude);
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

  const handleSaveEvidence = () => {
    const entry = {
      id: Date.now(),
      situation: selectedSituation,
      notes: evidence.notes,
      time: new Date().toLocaleString(),
      location: 'Auto-captured'
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { entry.location = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`; },
        () => { }
      );
    }

    const updated = [entry, ...savedEvidence];
    setSavedEvidence(updated);
    localStorage.setItem('avana_evidence', JSON.stringify(updated));
    setEvidence({ notes: '', file: null });
    alert('Evidence saved securely!');
  };

  const sendToGemini = async (message) => {
    setChatLoading(true);
    if (!GEMINI_URL) {
      setChatLoading(false);
      return 'AI assistant is not configured. For immediate safety, call emergency services (112) or a trusted person.';
    }

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'I understand this is difficult. Please stay calm and focus on your immediate safety. Consider calling a trusted friend or emergency services.';
    } catch (err) {
      console.error('Gemini AI error:', err);
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

  const renderPlaceCard = (place, type) => (
    <div key={`${place.lat}-${place.lng}`} className="place-card">
      <div className="place-info">
        <span className="place-icon">
          {type === 'police' ? '🚔' : type === 'hospital' ? '🏥' : '👩'}
        </span>
        <div>
          <p className="place-name">{place.name}</p>
          <p className="place-distance">{place.distance.toFixed(1)} km away</p>
        </div>
      </div>
      <a 
        href={getGoogleMapsDirectionsUrl(place.lat, place.lng)} 
        target="_blank" 
        rel="noopener noreferrer"
        className="directions-btn"
      >
        Directions
      </a>
    </div>
  );

  return (
    <div className="safety-screen">
      <header className="safety-header">
        <h1>Safety Center</h1>
        <p>AI-Powered Protection</p>
      </header>

      <div className="safety-content">
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

        <div className="emergency-actions">
          <div className="action-title">
            <span>🚨</span> Emergency Actions
          </div>
          <div className="emergency-buttons">
            <button className="sos-btn" onClick={handleSOSClick}>
              <span className="sos-glow"></span>
              🚨 SOS Alert
            </button>
            <button className="call-btn" onClick={() => handleCallEmergency('112')}>
              📞 Call 112
            </button>
            <button className="whatsapp-btn" onClick={handleWhatsAppSOS}>
              💬 WhatsApp SOS
            </button>
          </div>
        </div>

        <div className="section">
          <div className="section-header" onClick={() => toggleSection('contacts')}>
            <span>👥</span> Emergency Contacts
            <span className="contact-count">{emergencyContacts.length}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'contacts' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
            </svg>
          </div>
          {expandedSection === 'contacts' && (
            <div className="contacts-section">
              {loadingContacts ? (
                <div className="loading-text">Loading contacts...</div>
              ) : emergencyContacts.length > 0 ? (
                <div className="contacts-list">
                  {emergencyContacts.map(contact => (
                    <div key={contact.id} className="contact-item">
                      <div className="contact-info">
                        <p className="contact-name">{contact.name}</p>
                        <p className="contact-phone">{contact.phone}</p>
                        <p className="contact-relationship">{contact.relationship}</p>
                      </div>
                      <div className="contact-actions">
                        <button onClick={() => handleCallEmergency(contact.phone)}>📞</button>
                        <button onClick={() => handleSimulateCall(contact)}>📱</button>
                        <button onClick={() => handleDeleteContact(contact.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-contacts">No emergency contacts added</div>
              )}
              <div className="add-contact-form">
                <input
                  type="text"
                  placeholder="Name"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newContact.phone}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Relationship"
                  value={newContact.relationship}
                  onChange={e => setNewContact({ ...newContact, relationship: e.target.value })}
                />
                <button onClick={handleAddContact}>+ Add Contact</button>
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-header" onClick={() => toggleSection('nearby')}>
            <span>📍</span> Nearby Help Centers
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'nearby' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
            </svg>
          </div>
          {expandedSection === 'nearby' && (
            <div className="nearby-section">
              {loadingPlaces ? (
                <div className="loading-text">Finding nearby places...</div>
              ) : (
                <>
                  <div className="places-category">
                    <h4>🚔 Police Stations</h4>
                    {nearbyPlaces.police.length > 0 ? (
                      nearbyPlaces.police.map(place => renderPlaceCard(place, 'police'))
                    ) : (
                      <p className="no-places">No police stations found nearby</p>
                    )}
                  </div>
                  <div className="places-category">
                    <h4>🏥 Hospitals</h4>
                    {nearbyPlaces.hospital.length > 0 ? (
                      nearbyPlaces.hospital.map(place => renderPlaceCard(place, 'hospital'))
                    ) : (
                      <p className="no-places">No hospitals found nearby</p>
                    )}
                  </div>
                  <div className="places-category">
                    <h4>👩 Women Help Centers</h4>
                    {nearbyPlaces.women.length > 0 ? (
                      nearbyPlaces.women.map(place => renderPlaceCard(place, 'women'))
                    ) : (
                      <p className="no-places">No women help centers found nearby</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="immediate-action">
          <div className="action-title">
            <span>⚠️</span> Immediate Action
          </div>
          <div className="action-buttons">
            <button className="share-btn" onClick={handleShareLocation}>
              📍 Share Location
            </button>
          </div>
        </div>

        <div className="section situation-selector">
          <div className="section-header" onClick={() => toggleSection('situations')}>
            <span>🚨</span> Select Situation
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'situations' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
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
                <polyline points={expandedSection === 'tips' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
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
              <polyline points={expandedSection === 'evidence' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
            </svg>
          </div>
          {expandedSection === 'evidence' && (
            <div className="evidence-form">
              <div className="form-row">
                <input type="file" id="evidence-file" className="file-input" />
                <label htmlFor="evidence-file" className="file-label">📎 Attach Screenshot/Video</label>
              </div>
              <textarea
                placeholder="Quick notes about what happened..."
                value={evidence.notes}
                onChange={e => setEvidence({ ...evidence, notes: e.target.value })}
                rows="3"
              />
              <div className="form-meta">
                <span>⏰ {new Date().toLocaleTimeString()}</span>
                <span>📍 Auto-capture location on save</span>
              </div>
              <button className="save-btn" onClick={handleSaveEvidence}>Save Evidence</button>
              {savedEvidence.length > 0 && (
                <div className="saved-count">{savedEvidence.length} evidence(s) saved</div>
              )}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-header" onClick={() => toggleSection('legal')}>
            <span>⚖️</span> Next Steps
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={expandedSection === 'legal' ? "18,15 12,9 6,15" : "6,9 12,15 18,9"} />
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
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

      {showCallModal && (
        <div className="call-modal">
          <div className="call-content">
            <div className="call-icon">
              {callStatus === 'calling' ? '📞' : callStatus === 'connected' ? '💬' : '✅'}
            </div>
            <p className="call-status">
              {callStatus === 'calling' && `Calling ${callContact?.name}...`}
              {callStatus === 'connected' && `Connected with ${callContact?.name}`}
              {callStatus === 'ended' && 'Call ended'}
            </p>
            {callStatus === 'calling' && <div className="call-pulse"></div>}
            {callStatus === 'connected' && <p className="call-duration">00:08</p>}
            <button className="end-call-btn" onClick={() => setShowCallModal(false)}>
              {callStatus === 'connected' ? 'End Call' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}