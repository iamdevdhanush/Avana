import React, { useState, useEffect, useCallback } from 'react';
import { saveUserProfile, getEmergencyContacts, saveEmergencyContact, deleteEmergencyContact } from '../services/supabase';
import './ProfileScreen.css';

export function ProfileScreen({ onLogout, user }) {
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Friend' });
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    autoSOS: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    if (user?.name) setEditName(user.name);
    if (user?.phone) setEditPhone(user.phone);
  }, [user]);

  const loadContacts = useCallback(async () => {
    if (!user?.id) return;
    setLoadingContacts(true);
    try {
      const { data } = await getEmergencyContacts(user.id);
      if (data) setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
    setLoadingContacts(false);
  }, [user?.id]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveUserProfile({
        id: user.id,
        name: editName,
        age: user.age,
        phone: editPhone,
        guardian_phone: user.guardian_phone
      });
      setSaveMsg('Profile saved!');
      setTimeout(() => setSaveMsg(''), 2000);
      setEditMode(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveMsg('Error saving profile');
    }
    setSaving(false);
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone || !user?.id) return;
    try {
      const { data } = await saveEmergencyContact({
        userId: user.id,
        name: newContact.name,
        phone: newContact.phone,
        relationship: newContact.relation
      });
      if (data) {
        await loadContacts();
        setNewContact({ name: '', phone: '', relation: 'Friend' });
        setShowAddContact(false);
      }
    } catch (err) {
      console.error('Error adding contact:', err);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await deleteEmergencyContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  const handleToggleSetting = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  // Use first letters of display name for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const displayName = user?.name || 'User';

  return (
    <div className="profile-screen">
      <header className="page-header">
        <h1 className="page-title">Profile</h1>
      </header>

      <div className="profile-content scroll-content">
        <section className="profile-section">
          <div className="profile-card card">
            <div className="profile-avatar">
              <span>{getInitials(displayName)}</span>
            </div>
            <div className="profile-info">
              {editMode ? (
                <>
                  <input
                    className="input-field"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Your name"
                    style={{ marginBottom: 8 }}
                  />
                  <input
                    className="input-field"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                  {saveMsg && <p style={{ color: saveMsg.includes('Error') ? 'var(--red)' : 'var(--green)', fontSize: 13, marginTop: 8 }}>{saveMsg}</p>}
                </>
              ) : (
                <>
                  <h2>{displayName}</h2>
                  <p>{user?.email || ''}</p>
                  {user?.age && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Age: {user.age}</p>}
                  {user?.phone && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.phone}</p>}
                </>
              )}
            </div>
            <button className="edit-btn" onClick={() => {
              if (editMode) handleSaveProfile();
              else setEditMode(true);
            }} disabled={saving}>
              {editMode ? (saving ? '...' : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
                </svg>
              )) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              )}
            </button>
          </div>
        </section>

        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Emergency Contacts</h2>
            <button className="add-btn" onClick={() => setShowAddContact(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>
          </div>

          <div className="contacts-list">
            {loadingContacts ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px' }}>Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px' }}>No emergency contacts added yet</p>
            ) : contacts.map((contact) => (
              <div key={contact.id} className="contact-card card">
                <div className="contact-avatar">{contact.name?.charAt(0) || '?'}</div>
                <div className="contact-info">
                  <div className="contact-header">
                    <h3>{contact.name}</h3>
                  </div>
                  <p className="contact-phone">{contact.phone}</p>
                  <p className="contact-relation">{contact.relationship}</p>
                </div>
                <button className="delete-btn" onClick={() => handleDeleteContact(contact.id)}>
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
            {[
              { key: 'notifications', label: 'Push Notifications', desc: 'Receive safety alerts' },
              { key: 'locationSharing', label: 'Location Sharing', desc: 'Share location with contacts' },
              { key: 'autoSOS', label: 'Auto SOS', desc: 'Trigger SOS if no activity' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="setting-item card">
                <div className="setting-info">
                  <div>
                    <h3>{label}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
                <div
                  className={`toggle-switch ${settings[key] ? 'active' : ''}`}
                  onClick={() => handleToggleSetting(key)}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="profile-section">
          <h2 className="section-title">Privacy</h2>
          <div className="privacy-options">
            {['Privacy Policy', 'Terms of Service', 'Data & Security'].map(item => (
              <button key={item} className="privacy-btn card">
                <span>{item}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            ))}
          </div>
        </section>

        <button className="logout-btn btn btn-block" onClick={onLogout}>Log Out</button>
        <p className="app-version">Avana v1.1.0</p>
        <div style={{ height: '100px' }}></div>
      </div>

      {showAddContact && (
        <div className="modal-overlay" onClick={() => setShowAddContact(false)}>
          <div className="contact-modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Emergency Contact</h2>
              <button className="close-btn" onClick={() => setShowAddContact(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Name</label>
              <input type="text" className="input-field" placeholder="Contact name" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input type="tel" className="input-field" placeholder="+91 XXXXX XXXXX" value={newContact.phone} onChange={(e) => setNewContact({...newContact, phone: e.target.value})} />
            </div>
            <div className="input-group">
              <label className="input-label">Relation</label>
              <select className="input-field" value={newContact.relation} onChange={(e) => setNewContact({...newContact, relation: e.target.value})}>
                <option>Family</option><option>Friend</option><option>Colleague</option><option>Other</option>
              </select>
            </div>

            <button className="btn btn-primary btn-block" onClick={handleAddContact} disabled={!newContact.name || !newContact.phone}>
              Add Contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
