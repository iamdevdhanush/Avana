import React, { useState } from 'react';
import './ProfileScreen.css';

const initialContacts = [
  { id: 1, name: 'Mom', phone: '+91 98765 43210', relation: 'Family', primary: true },
  { id: 2, name: 'Priya', phone: '+91 87654 32109', relation: 'Friend', primary: false },
];

export function ProfileScreen({ onLogout }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Friend' });
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    autoSOS: false,
    darkMode: true
  });

  const handleAddContact = () => {
    if (newContact.name && newContact.phone) {
      setContacts([...contacts, { ...newContact, id: Date.now(), primary: false }]);
      setNewContact({ name: '', phone: '', relation: 'Friend' });
      setShowAddContact(false);
    }
  };

  const handleDeleteContact = (id) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleToggleSetting = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="profile-screen">
      <header className="page-header">
        <h1 className="page-title">Profile</h1>
      </header>

      <div className="profile-content scroll-content">
        <section className="profile-section">
          <div className="profile-card card">
            <div className="profile-avatar">
              <span>AS</span>
            </div>
            <div className="profile-info">
              <h2>Aisha Sharma</h2>
              <p>aisha.sharma@email.com</p>
            </div>
            <button className="edit-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Emergency Contacts</h2>
            <button 
              className="add-btn"
              onClick={() => setShowAddContact(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>
          </div>
          
          <div className="contacts-list">
            {contacts.map((contact) => (
              <div key={contact.id} className="contact-card card">
                <div className="contact-avatar">
                  {contact.name.charAt(0)}
                </div>
                <div className="contact-info">
                  <div className="contact-header">
                    <h3>{contact.name}</h3>
                    {contact.primary && (
                      <span className="primary-badge">Primary</span>
                    )}
                  </div>
                  <p className="contact-phone">{contact.phone}</p>
                  <p className="contact-relation">{contact.relation}</p>
                </div>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteContact(contact.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-section">
          <h2 className="section-title">Settings</h2>
          
          <div className="settings-list">
            <div className="setting-item card">
              <div className="setting-info">
                <div className="setting-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <div>
                  <h3>Push Notifications</h3>
                  <p>Receive safety alerts</p>
                </div>
              </div>
              <div 
                className={`toggle-switch ${settings.notifications ? 'active' : ''}`}
                onClick={() => handleToggleSetting('notifications')}
              >
                <div className="toggle-knob"></div>
              </div>
            </div>

            <div className="setting-item card">
              <div className="setting-info">
                <div className="setting-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div>
                  <h3>Location Sharing</h3>
                  <p>Share location with contacts</p>
                </div>
              </div>
              <div 
                className={`toggle-switch ${settings.locationSharing ? 'active' : ''}`}
                onClick={() => handleToggleSetting('locationSharing')}
              >
                <div className="toggle-knob"></div>
              </div>
            </div>

            <div className="setting-item card">
              <div className="setting-info">
                <div className="setting-icon" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
                    <path d="M3.59 10.93A19.79 19.79 0 0 1 .69 2.17 2 2 0 0 1 2.87 0h3a2 2 0 0 1 2 1.72"/>
                  </svg>
                </div>
                <div>
                  <h3>Auto SOS</h3>
                  <p>Trigger SOS if no activity</p>
                </div>
              </div>
              <div 
                className={`toggle-switch ${settings.autoSOS ? 'active' : ''}`}
                onClick={() => handleToggleSetting('autoSOS')}
              >
                <div className="toggle-knob"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <h2 className="section-title">Privacy</h2>
          
          <div className="privacy-options">
            <button className="privacy-btn card">
              <span>Privacy Policy</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
            <button className="privacy-btn card">
              <span>Terms of Service</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
            <button className="privacy-btn card">
              <span>Data & Security</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </div>
        </section>

        <button className="logout-btn btn btn-block" onClick={onLogout}>
          Log Out
        </button>

        <p className="app-version">SafeSteps v1.0.0</p>

        <div style={{ height: '100px' }}></div>
      </div>

      {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="contact-modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Emergency Contact</h2>
              <button className="close-btn" onClick={() => setShowAddContact(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Contact name"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input 
                type="tel" 
                className="input-field" 
                placeholder="+91 XXXXX XXXXX"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Relation</label>
              <select 
                className="input-field"
                value={newContact.relation}
                onChange={(e) => setNewContact({...newContact, relation: e.target.value})}
              >
                <option>Family</option>
                <option>Friend</option>
                <option>Colleague</option>
                <option>Other</option>
              </select>
            </div>

            <button 
              className="btn btn-primary btn-block"
              onClick={handleAddContact}
              disabled={!newContact.name || !newContact.phone}
            >
              Add Contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
