import { getUserProfile, saveUserProfile } from './supabase';

/**
 * Creates a new profile in Supabase or returns the existing one.
 * BUG FIX: Now accepts optional extraData so signup age/guardian_phone is saved correctly.
 */
export const createOrGetUserProfile = async (firebaseUser, extraData = {}) => {
  try {
    const { data: profile, error } = await getUserProfile(firebaseUser.uid);

    // PGRST116 = "no rows returned" — expected for new users
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (profile) {
      return profile;
    }

    // New user — create profile, merging Firebase display name with any extra sign-up data
    const newProfile = {
      id: firebaseUser.uid,
      name: extraData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      age: extraData.age ?? 18,
      phone: extraData.phone || '',
      guardian_phone: extraData.guardian_phone || null,
    };

    const { data: createdProfile, error: createError } = await saveUserProfile(newProfile);

    if (createError) {
      throw createError;
    }

    // saveUserProfile returns an array from the .select() call; return the first element
    return Array.isArray(createdProfile) ? createdProfile[0] : createdProfile;
  } catch (error) {
    console.error('Error in createOrGetUserProfile:', error);
    // Return a minimal fallback so the app can still proceed
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      age: 18,
      phone: '',
      guardian_phone: null,
    };
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const { data, error } = await saveUserProfile(profileData);
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserAge = async (userId) => {
  try {
    const { data: profile, error } = await getUserProfile(userId);
    if (error && error.code !== 'PGRST116') throw error;
    return profile ? profile.age : null;
  } catch (error) {
    console.error('Error getting user age:', error);
    return null;
  }
};

export const requiresGuardianPhone = async (userId) => {
  try {
    const age = await getUserAge(userId);
    return age !== null && age < 18;
  } catch (error) {
    console.error('Error checking if guardian phone required:', error);
    return false;
  }
};