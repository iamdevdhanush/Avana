import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToPosts, createPost, toggleLike,
  subscribeToComments, addComment, getUserLikes
} from '../services/firebaseCommunity';
import './CommunityScreen.css';

function timeAgo(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  } catch {
    return '';
  }
}

export function CommunityScreen({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Comments state
  const [activeComments, setActiveComments] = useState({});   // postId -> comments[]
  const [newComments, setNewComments] = useState({});          // postId -> string
  const [sendingComment, setSendingComment] = useState({});    // postId -> bool
  const commentUnsubsRef = useRef({});

  // Likes state
  const [userLikes, setUserLikes] = useState({});  // postId -> bool
  const [likingPost, setLikingPost] = useState({}); // postId -> bool (prevent double-tap)

  // ─── Real-time posts subscription ────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToPosts((fetchedPosts, err) => {
      if (err) {
        setError('Could not load posts. Please check your connection.');
        setLoading(false);
        return;
      }
      setPosts(fetchedPosts);
      setError(null);
      setLoading(false);

      // Batch-check which posts the current user has liked
      if (user?.id && fetchedPosts.length > 0) {
        const postIds = fetchedPosts.map(p => p.id);
        getUserLikes(postIds, user.id)
          .then(likes => setUserLikes(prev => ({ ...prev, ...likes })))
          .catch(() => {});
      }
    });

    return () => {
      unsubscribe();
      // Clean up all comment subscriptions
      Object.values(commentUnsubsRef.current).forEach(unsub => {
        try { unsub(); } catch {}
      });
      commentUnsubsRef.current = {};
    };
  }, [user?.id]);

  // ─── Create Post (optimistic) ────────────────────────────────
  const handlePostSubmit = useCallback(async () => {
    if (!newPostContent.trim() || submitting) return;
    setSubmitting(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticPost = {
      id: tempId,
      content: newPostContent.trim(),
      userId: user?.id,
      userName: user?.displayName || user?.name || 'You',
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      _optimistic: true
    };

    // Optimistic: prepend immediately
    setPosts(prev => [optimisticPost, ...prev]);
    setNewPostContent('');

    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {}
      }

      await createPost({
        content: optimisticPost.content,
        userId: user?.id,
        userName: optimisticPost.userName,
        location
      });
      // onSnapshot will replace the optimistic post with the real one
    } catch (err) {
      console.error('Error posting:', err);
      setError('Could not submit post. Try again.');
      // Roll back optimistic post
      setPosts(prev => prev.filter(p => p.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  }, [newPostContent, submitting, user]);

  // ─── Like Toggle (optimistic) ────────────────────────────────
  const handleLikeToggle = useCallback(async (postId) => {
    if (!user?.id || likingPost[postId]) return;

    const wasLiked = !!userLikes[postId];

    // Optimistic update
    setUserLikes(prev => ({ ...prev, [postId]: !wasLiked }));
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) + (wasLiked ? -1 : 1)) }
        : p
    ));

    setLikingPost(prev => ({ ...prev, [postId]: true }));
    try {
      await toggleLike(postId, user.id);
    } catch (err) {
      console.error('Like error:', err);
      // Roll back
      setUserLikes(prev => ({ ...prev, [postId]: wasLiked }));
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) + (wasLiked ? 1 : -1)) }
          : p
      ));
    } finally {
      setLikingPost(prev => ({ ...prev, [postId]: false }));
    }
  }, [user?.id, userLikes, likingPost]);

  // ─── Comments ────────────────────────────────────────────────
  const toggleCommentsSection = useCallback((postId) => {
    if (activeComments[postId] !== undefined) {
      // Collapse
      setActiveComments(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      if (commentUnsubsRef.current[postId]) {
        commentUnsubsRef.current[postId]();
        delete commentUnsubsRef.current[postId];
      }
    } else {
      // Expand — subscribe to real-time comments
      setActiveComments(prev => ({ ...prev, [postId]: [] })); // show empty while loading
      commentUnsubsRef.current[postId] = subscribeToComments(postId, (comments) => {
        setActiveComments(prev =>
          prev[postId] !== undefined ? { ...prev, [postId]: comments } : prev
        );
      });
    }
  }, [activeComments]);

  const handleCommentSubmit = useCallback(async (postId) => {
    const content = newComments[postId]?.trim();
    if (!content || sendingComment[postId]) return;

    setSendingComment(prev => ({ ...prev, [postId]: true }));

    // Optimistic comment
    const tempComment = {
      id: `temp_${Date.now()}`,
      content,
      userId: user?.id,
      userName: user?.displayName || user?.name || 'You',
      createdAt: new Date(),
      _optimistic: true
    };
    setActiveComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), tempComment]
    }));
    setNewComments(prev => ({ ...prev, [postId]: '' }));

    try {
      await addComment({
        postId,
        content,
        userId: user?.id,
        userName: tempComment.userName
      });
      // onSnapshot will replace optimistic with real
    } catch (err) {
      console.error('Error submitting comment:', err);
      // Roll back
      setActiveComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id)
      }));
    } finally {
      setSendingComment(prev => ({ ...prev, [postId]: false }));
    }
  }, [newComments, sendingComment, user]);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="community-screen">
      <header className="page-header">
        <h1 className="page-title">Community Feed</h1>
        <p className="page-subtitle">Real-time alerts and discussions</p>
      </header>

      <div className="new-post-box card">
        <textarea
          className="post-textarea input-field"
          placeholder="Share an alert, incident, or update..."
          value={newPostContent}
          onChange={e => setNewPostContent(e.target.value)}
          rows="3"
        />
        <div className="post-box-footer">
          <button
            className="btn btn-primary"
            onClick={handlePostSubmit}
            disabled={submitting || !newPostContent.trim()}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ margin: '0 20px 12px', padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(255,61,61,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--red)', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="posts-list scroll-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Loading Feed</h3>
            <p>Fetching community posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>All Clear</h3>
            <p>No community posts yet. Be the first to share!</p>
          </div>
        ) : posts.map(post => (
          <div key={post.id} className={`post-card card${post._optimistic ? ' post-optimistic' : ''}`}>
            <div className="post-header">
              <strong>{post.userName || 'Anonymous'}</strong>
              <span className="post-time">{timeAgo(post.createdAt)}</span>
            </div>
            <p className="post-content">{post.content}</p>
            {post.imageUrl && (
              <div className="post-image">
                <img src={post.imageUrl} alt="Post" loading="lazy" />
              </div>
            )}
            <div className="post-actions">
              <button
                className={`like-btn${userLikes[post.id] ? ' liked' : ''}`}
                onClick={() => handleLikeToggle(post.id)}
                disabled={post._optimistic || likingPost[post.id]}
              >
                {userLikes[post.id] ? '❤️' : '🤍'} {post.likesCount || 0}
              </button>
              <button className="comment-toggle-btn" onClick={() => toggleCommentsSection(post.id)}>
                💬 {activeComments[post.id] !== undefined
                  ? `Hide (${activeComments[post.id].length})`
                  : `Comments${post.commentsCount ? ` (${post.commentsCount})` : ''}`}
              </button>
            </div>

            {activeComments[post.id] !== undefined && (
              <div className="comments-section">
                <div className="comments-list">
                  {activeComments[post.id].length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No comments yet</p>
                  ) : activeComments[post.id].map(comment => (
                    <div key={comment.id} className={`comment${comment._optimistic ? ' comment-optimistic' : ''}`}>
                      <strong>{comment.userName || 'Anonymous'}</strong>
                      <span> {comment.content}</span>
                      <div className="comment-time">{timeAgo(comment.createdAt)}</div>
                    </div>
                  ))}
                </div>
                <div className="new-comment">
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Add a comment..."
                    value={newComments[post.id] || ''}
                    onChange={e => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleCommentSubmit(post.id)}
                  />
                  <button
                    className="btn btn-secondary send-comment-btn"
                    onClick={() => handleCommentSubmit(post.id)}
                    disabled={sendingComment[post.id]}
                  >
                    {sendingComment[post.id] ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}
