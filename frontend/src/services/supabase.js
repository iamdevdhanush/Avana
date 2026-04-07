import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STORAGE_BUCKET = 'evidence';

export async function uploadEvidence(file, userId) {
  try {
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
  } catch (err) {
    console.error('uploadEvidence error:', err);
    throw err;
  }
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
  try {
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
  } catch (err) {
    console.error('saveSafetyEvent error:', err);
    return { data: null, error: err };
  }
}

export async function getSafetyEvents(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('safety_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  } catch (err) {
    console.error('getSafetyEvents error:', err);
    return { data: null, error: err };
  }
}

export async function saveEvidence(evidence) {
  try {
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
  } catch (err) {
    console.error('saveEvidence error:', err);
    return { data: null, error: err };
  }
}

export async function getEvidence(userId) {
  try {
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    return { data, error };
  } catch (err) {
    console.error('getEvidence error:', err);
    return { data: null, error: err };
  }
}

export async function saveCommunityReport(report) {
  try {
    const { data, error } = await supabase
      .from('community_reports')
      .insert([{
        user_id: report.userId || null,
        lat: report.lat,
        lng: report.lng,
        type: report.type,
        description: report.description,
        severity: report.severity || 'medium'
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('saveCommunityReport error:', err);
    return { data: null, error: err };
  }
}

export async function getCommunityReports(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return { data, error };
  } catch (err) {
    console.error('getCommunityReports error:', err);
    return { data: null, error: err };
  }
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
  try {
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
  } catch (err) {
    console.error('getSafetyAnalytics error:', err);
    return { data: null, error: err };
  }
}

export async function saveUserProfile(profile) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        id: profile.id,
        name: profile.name,
        age: profile.age,
        phone: profile.phone,
        guardian_phone: profile.guardian_phone || null,
        updated_at: new Date().toISOString()
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('saveUserProfile error:', err);
    return { data: null, error: err };
  }
}

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('getUserProfile error:', err);
    return { data: null, error: err };
  }
}

export async function saveEmergencyContact(contact) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([{
        user_id: contact.userId,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('saveEmergencyContact error:', err);
    return { data: null, error: err };
  }
}

export async function getEmergencyContacts(userId) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);
    
    return { data, error };
  } catch (err) {
    console.error('getEmergencyContacts error:', err);
    return { data: null, error: err };
  }
}

export async function deleteEmergencyContact(contactId) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);
    
    return { data, error };
  } catch (err) {
    console.error('deleteEmergencyContact error:', err);
    return { data: null, error: err };
  }
}

export async function triggerSOSAlert(alert) {
  try {
    const { data, error } = await supabase
      .from('sos_alerts')
      .insert([{
        user_id: alert.userId,
        lat: alert.lat,
        lng: alert.lng,
        timestamp: new Date().toISOString(),
        status: 'TRIGGERED',
        message: alert.message || 'Emergency SOS alert'
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('triggerSOSAlert error:', err);
    return { data: null, error: err };
  }
}

export async function saveCommunityPost(post) {
  try {
    const locationValue = post.location
      ? (typeof post.location === 'string' ? post.location : JSON.stringify(post.location))
      : null;
    const { data, error } = await supabase
      .from('community_posts')
      .insert([{
        user_id: post.userId,
        content: post.content,
        location: locationValue
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('saveCommunityPost error:', err);
    return { data: null, error: err };
  }
}

export async function getCommunityPosts(limit = 50) {
  try {
    // Try with user_profiles FK join first
    const { data, error } = await supabase
      .from('community_posts')
      .select('*, user_profiles(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // If FK join fails (400), retry without it
    if (error && (error.code === '400' || error.message?.includes('relation') || error.code === 'PGRST200')) {
      console.warn('getCommunityPosts: FK join failed, falling back to plain select');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data: fallbackData, error: fallbackError };
    }
    
    return { data, error };
  } catch (err) {
    console.error('getCommunityPosts error:', err);
    return { data: null, error: err };
  }
}

export function subscribeToCommunityPosts(callback) {
  return supabase
    .channel('community_posts_changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_posts' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export async function saveComment(comment) {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert([{
        post_id: comment.postId,
        user_id: comment.userId,
        content: comment.content
      }])
      .select();
    
    return { data, error };
  } catch (err) {
    console.error('saveComment error:', err);
    return { data: null, error: err };
  }
}

export async function getComments(postId) {
  try {
    // Try with user_profiles FK join first
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, user_profiles(name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    // If FK join fails, retry without it
    if (error && (error.code === '400' || error.message?.includes('relation') || error.code === 'PGRST200')) {
      console.warn('getComments: FK join failed, falling back to plain select');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      return { data: fallbackData, error: fallbackError };
    }
    
    return { data, error };
  } catch (err) {
    console.error('getComments error:', err);
    return { data: null, error: err };
  }
}

export function subscribeToComments(postId, callback) {
  return supabase
    .channel(`comments_${postId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
