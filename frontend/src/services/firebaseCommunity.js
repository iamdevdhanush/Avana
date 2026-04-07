import { db } from '../firebase';
import {
  collection, addDoc, doc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp,
  increment, updateDoc, writeBatch
} from 'firebase/firestore';

// ─── Collection refs ───────────────────────────────────────────
const postsCol = collection(db, 'posts');

// ─── Posts ─────────────────────────────────────────────────────

/**
 * Subscribe to real-time posts feed.
 * Returns an unsubscribe function.
 */
export function subscribeToPosts(callback, feedLimit = 50) {
  const q = query(postsCol, orderBy('createdAt', 'desc'), limit(feedLimit));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date()
    }));
    callback(posts, null);
  }, (error) => {
    console.error('Posts listener error:', error);
    callback([], error);
  });
}

/**
 * Create a new post.
 */
export async function createPost({ content, imageUrl = null, userId, userName, location = null }) {
  const docRef = await addDoc(postsCol, {
    content,
    imageUrl,
    userId,
    userName: userName || 'Anonymous',
    location,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Delete a post (only owner should call this).
 */
export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId));
}

// ─── Likes ─────────────────────────────────────────────────────

/**
 * Toggle like on a post. Returns true if liked, false if unliked.
 */
export async function toggleLike(postId, userId) {
  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    // Unlike
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(-1) });
    return false;
  } else {
    // Like
    await setDoc(likeRef, { createdAt: serverTimestamp() });
    await updateDoc(doc(db, 'posts', postId), { likesCount: increment(1) });
    return true;
  }
}

/**
 * Check if a user has liked a post.
 */
export async function hasUserLiked(postId, userId) {
  const likeSnap = await getDoc(doc(db, 'posts', postId, 'likes', userId));
  return likeSnap.exists();
}

/**
 * Check likes for multiple posts at once (batch check).
 */
export async function getUserLikes(postIds, userId) {
  const likes = {};
  await Promise.all(
    postIds.map(async (postId) => {
      likes[postId] = await hasUserLiked(postId, userId);
    })
  );
  return likes;
}

// ─── Comments ──────────────────────────────────────────────────

/**
 * Subscribe to real-time comments for a post.
 * Returns an unsubscribe function.
 */
export function subscribeToComments(postId, callback) {
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const q = query(commentsCol, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date()
    }));
    callback(comments);
  }, (error) => {
    console.error('Comments listener error:', error);
    callback([]);
  });
}

/**
 * Add a comment to a post.
 */
export async function addComment({ postId, content, userId, userName }) {
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const batch = writeBatch(db);

  const commentRef = doc(commentsCol);
  batch.set(commentRef, {
    content,
    userId,
    userName: userName || 'Anonymous',
    createdAt: serverTimestamp()
  });

  // Increment commentsCount on the post
  const postRef = doc(db, 'posts', postId);
  batch.update(postRef, { commentsCount: increment(1) });

  await batch.commit();
  return commentRef.id;
}

/**
 * Delete a comment.
 */
export async function deleteComment(postId, commentId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'posts', postId, 'comments', commentId));
  batch.update(doc(db, 'posts', postId), { commentsCount: increment(-1) });
  await batch.commit();
}
