import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

export const signUp = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
};

export const signIn = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async () => {
  return await firebaseSignOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;
