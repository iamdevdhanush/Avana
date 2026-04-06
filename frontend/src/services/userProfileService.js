import { getUserProfile, saveUserProfile } from './supabase';

/**
 * Service to handle user profile operations between Firebase and Supabase
 */

export const createOrGetUserProfile = async (firebaseUser) => {
  try {
    // Try to get existing profile from Supabase
    const { data: profile, error } = await getUserProfile(firebaseUser.uid);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw error;
    }
    
    if (profile) {
      // Profile exists, return it
      return profile;
    }
    
    // Profile doesn't exist, create new one
    const newProfile = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      age: 18, // Default age, should be updated by user
      phone: '', // Should be filled by user
      guardian_phone: null, // Will be set if age < 18
    };
    
    const { data: createdProfile, error: createError } = await saveUserProfile(newProfile);
    
    if (createError) {
      throw createError;
    }
    
    return createdProfile;
  } catch (error) {
    console.error('Error in createOrGetUserProfile:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const { data, error } = await saveUserProfile(profileData);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const getUserAge = async (userId) => {
  try {
    const { data: profile, error } = await getUserProfile(userId);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return profile ? profile.age : null;
  } catch (error) {
    console.error('Error getting user age:', error);
    throw error;
  }
};

export const requiresGuardianPhone = async (userId) => {
  try {
    const age = await getUserAge(userId);
    return age !== null && age < 18;
  } catch (error) {
    console.error('Error checking if guardian phone required:', error);
    return false; // Default to false on error
  }
};