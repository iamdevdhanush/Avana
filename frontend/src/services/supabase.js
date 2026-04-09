import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] CRITICAL: Missing environment variables!');
  console.error('[Supabase] Add to your .env file:');
  console.error('[Supabase] REACT_APP_SUPABASE_URL=your-supabase-url');
  console.error('[Supabase] REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: window.location.hostname !== 'localhost' ? false : true,
  },
});

export const STORAGE_BUCKET = 'evidence';

export async function signUp(email, password, metadata = {}) {
  try {
    console.log('[Auth] Signing up:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('[Auth] Signup error:', error);
      return { data: null, error };
    }
    
    console.log('[Auth] Signup success:', data);
    return { data, error: null };
  } catch (err) {
    console.error('[Auth] Signup exception:', err);
    return { data: null, error: err };
  }
}

export async function signIn(email, password) {
  try {
    console.log('[Auth] Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('[Auth] Signin error:', error);
      return { data: null, error };
    }
    
    if (!data.user?.email_confirmed_at) {
      console.warn('[Auth] Email not verified');
      await supabase.auth.signOut();
      return { 
        data: null, 
        error: { message: 'Please verify your email before signing in. Check your inbox for the verification link.' } 
      };
    }
    
    console.log('[Auth] Signin success:', data.user?.id);
    return { data, error: null };
  } catch (err) {
    console.error('[Auth] Signin exception:', err);
    return { data: null, error: err };
  }
}

export async function signOut() {
  try {
    console.log('[Auth] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Signout error:', error);
    }
    return { error };
  } catch (err) {
    console.error('[Auth] Signout exception:', err);
    return { error: err };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[Auth] Get user error:', error);
      return null;
    }
    return user;
  } catch (err) {
    console.error('[Auth] Get user exception:', err);
    return null;
  }
}

export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Get session error:', error);
      return null;
    }
    return session;
  } catch (err) {
    console.error('[Auth] Get session exception:', err);
    return null;
  }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] State change:', event, session?.user?.id);
    callback(event, session);
  });
}

export async function resendConfirmationEmail(email) {
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  } catch (err) {
    console.error('[Auth] Resend email error:', err);
    return { data: null, error: err };
  }
}

export async function uploadEvidence(file, userId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file);
    
    if (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error('[Storage] Upload exception:', err);
    throw err;
  }
}

export async function saveUserProfile(profile) {
  try {
    console.log('[DB] Saving user profile:', profile.id);
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        id: profile.id,
        name: profile.name || profile.email?.split('@')[0],
        age: profile.age || null,
        phone: profile.phone || null,
        guardian_phone: profile.guardian_phone || null,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Save profile error:', error);
      return { data: null, error };
    }
    
    console.log('[DB] Profile saved:', data);
    return { data, error: null };
  } catch (err) {
    console.error('[DB] Save profile exception:', err);
    return { data: null, error: err };
  }
}

export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[DB] Get profile error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[DB] Get profile exception:', err);
    return { data: null, error: err };
  }
}

export async function saveCommunityPost(post) {
  try {
    console.log('[DB] Saving community post for user:', post.userId);
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
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Save post error:', error);
      console.error('[DB] Error details:', JSON.stringify(error, null, 2));
      return { data: null, error };
    }
    
    console.log('[DB] Post saved:', data);
    return { data, error: null };
  } catch (err) {
    console.error('[DB] Save post exception:', err);
    return { data: null, error: err };
  }
}

export async function getCommunityPosts(limit = 50) {
  try {
    console.log('[DB] Fetching community posts...');
    
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user_profiles (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[DB] Get posts error:', error);
      console.error('[DB] Error code:', error.code);
      console.error('[DB] Error message:', error.message);
      return { data: null, error };
    }
    
    console.log('[DB] Posts fetched:', data?.length || 0);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[DB] Get posts exception:', err);
    return { data: null, error: err };
  }
}

export function subscribeToCommunityPosts(callback) {
  try {
    console.log('[Realtime] Subscribing to community posts...');
    const channel = supabase
      .channel('community_posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_posts'
        },
        (payload) => {
          console.log('[Realtime] New post received:', payload.new);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });
    
    return channel;
  } catch (err) {
    console.error('[Realtime] Subscribe error:', err);
    return { unsubscribe: () => {} };
  }
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
      .select()
      .single();
    
    if (error) {
      console.error('[DB] Save comment error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[DB] Save comment exception:', err);
    return { data: null, error: err };
  }
}

export async function getComments(postId) {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        user_profiles (
          id,
          name
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[DB] Get comments error:', error);
      return { data: null, error };
    }
    
    return { data: data || [], error: null };
  } catch (err) {
    console.error('[DB] Get comments exception:', err);
    return { data: null, error: err };
  }
}

export function subscribeToComments(postId, callback) {
  return supabase
    .channel(`comments_${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
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
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('[DB] Save safety event error:', err);
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
    
    return { data: data || [], error };
  } catch (err) {
    console.error('[DB] Get safety events error:', err);
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
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('[DB] Save community report error:', err);
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
    
    return { data: data || [], error };
  } catch (err) {
    console.error('[DB] Get community reports error:', err);
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
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('[DB] SOS alert error:', err);
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
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('[DB] Save emergency contact error:', err);
    return { data: null, error: err };
  }
}

export async function getEmergencyContacts(userId) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);
    
    return { data: data || [], error };
  } catch (err) {
    console.error('[DB] Get emergency contacts error:', err);
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
    console.error('[DB] Delete emergency contact error:', err);
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
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('[DB] Save evidence error:', err);
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
    
    return { data: data || [], error };
  } catch (err) {
    console.error('[DB] Get evidence error:', err);
    return { data: null, error: err };
  }
}

export function unsubscribe(channel) {
  if (channel && typeof channel.unsubscribe === 'function') {
    channel.unsubscribe();
  }
}
