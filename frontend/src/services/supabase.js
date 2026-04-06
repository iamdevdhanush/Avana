import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const STORAGE_BUCKET = 'evidence';

export async function uploadEvidence(file, userId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);
  
  return urlData.publicUrl;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function saveSafetyEvent(event) {
  const { data, error } = await supabase
    .from('safety_events')
    .insert([{
      user_id: event.userId,
      lat: event.lat,
      lng: event.lng,
      risk_level: event.riskLevel,
      event_type: event.eventType || 'zone_alert',
      description: event.description || null
    }])
    .select();
  
  return { data, error };
}

export async function getSafetyEvents(limit = 100) {
  const { data, error } = await supabase
    .from('safety_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
}

export async function saveEvidence(evidence) {
  const { data, error } = await supabase
    .from('evidence')
    .insert([{
      user_id: evidence.userId,
      file_url: evidence.fileUrl,
      notes: evidence.notes,
      location: evidence.location,
      timestamp: new Date().toISOString()
    }])
    .select();
  
  return { data, error };
}

export async function getEvidence(userId) {
  const { data, error } = await supabase
    .from('evidence')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  
  return { data, error };
}

export async function saveCommunityReport(report) {
  const { data, error } = await supabase
    .from('community_reports')
    .insert([{
      lat: report.lat,
      lng: report.lng,
      type: report.type,
      description: report.description,
      severity: report.severity || 'medium'
    }])
    .select();
  
  return { data, error };
}

export async function getCommunityReports(limit = 50) {
  const { data, error } = await supabase
    .from('community_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return { data, error };
}

export function subscribeToCommunityReports(callback) {
  return supabase
    .channel('community_reports_changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'community_reports' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export function subscribeToSafetyEvents(callback) {
  return supabase
    .channel('safety_events_changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'safety_events' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export function unsubscribe(channel) {
  supabase.removeChannel(channel);
}

export async function getSafetyAnalytics(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data, error } = await supabase
    .from('safety_events')
    .select('risk_level, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  if (error) return { data: null, error };
  
  const analytics = {
    total: data?.length || 0,
    highRisk: data?.filter(e => e.risk_level === 'HIGH' || e.risk_level === 'CRITICAL').length || 0,
    mediumRisk: data?.filter(e => e.risk_level === 'MEDIUM').length || 0,
    lowRisk: data?.filter(e => e.risk_level === 'LOW').length || 0
  };
  
  return { data: analytics, error: null };
}
