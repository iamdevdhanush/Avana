import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCommunityPosts, saveCommunityPost, subscribeToCommunityPosts,
  getComments, saveComment
} from '../services/supabase';
import './CommunityScreen.css';

function timeAgo(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
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
  const [activeComments, setActiveComments] = useState({});   // postId -> comments[]
  const [newComments, setNewComments] = useState({});          // postId -> string
  const [sendingComment, setSendingComment] = useState({});    // postId -> bool

  // BUG FIX: Use ref to track all realtime comment subscriptions and clean them up
  const commentSubsRef = useRef({});
  // BUG FIX: Track posts subscription for cleanup
  const postsSubRef = useRef(null);

  const loadPosts = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchErr } = await getCommunityPosts(50);
      if (fetchErr) throw fetchErr;
      if (data) setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Could not load posts. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();

    // Set up posts subscription
    postsSubRef.current = subscribeToCommunityPosts(() => {
      loadPosts();
    });

    return () => {
      // BUG FIX: Clean up posts subscription on unmount
      if (postsSubRef.current) {
        postsSubRef.current.unsubscribe();
        postsSubRef.current = null;
      }
      // BUG FIX: Clean up all comment subscriptions on unmount
      Object.values(commentSubsRef.current).forEach(sub => {
        try { sub.unsubscribe(); } catch {}
      });
      commentSubsRef.current = {};
    };
  }, [loadPosts]);

  const handlePostSubmit = async () => {
    if (!newPostContent.trim() || submitting) return;
    setSubmitting(true);

    const submit = async (location) => {
      try {
        const { error: postErr } = await saveCommunityPost({
          userId: user?.id,
          content: newPostContent.trim(),
          location
        });
        if (postErr) throw postErr;
        setNewPostContent('');
      } catch (err) {
        console.error('Error posting:', err);
        setError('Could not submit post. Try again.');
      } finally {
        setSubmitting(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => submit({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => submit(null),
        { timeout: 5000 }
      );
    } else {
      submit(null);
    }
  };

  const toggleComments = async (postId) => {
    if (activeComments[postId] !== undefined) {
      // Collapse comments for this post
      setActiveComments(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      // BUG FIX: Also unsubscribe from comment channel when collapsing
      if (commentSubsRef.current[postId]) {
        try { commentSubsRef.current[postId].unsubscribe(); } catch {}
        delete commentSubsRef.current[postId];
      }
    } else {
      // Load and subscribe to comments
      try {
        const { data } = await getComments(postId);
        setActiveComments(prev => ({ ...prev, [postId]: data || [] }));

        // BUG FIX: Only subscribe if not already subscribed
        if (!commentSubsRef.current[postId]) {
          const { subscribeToComments } = await import('../services/supabase');
          commentSubsRef.current[postId] = subscribeToComments(postId, () => {
            getComments(postId).then(res => {
              if (res.data) {
                setActiveComments(prev =>
                  prev[postId] !== undefined ? { ...prev, [postId]: res.data } : prev
                );
              }
            });
          });
        }
      } catch (err) {
        console.error('Error loading comments:', err);
      }
    }
  };

  const handleCommentSubmit = async (postId) => {
    const content = newComments[postId]?.trim();
    if (!content || sendingComment[postId]) return;
    setSendingComment(prev => ({ ...prev, [postId]: true }));
    try {
      await saveComment({ postId, userId: user?.id, content });
      setNewComments(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSendingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

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
          <div key={post.id} className="post-card card">
            <div className="post-header">
              <strong>{post.user_profiles?.name || 'Anonymous'}</strong>
              <span className="post-time">{timeAgo(post.created_at)}</span>
            </div>
            <p className="post-content">{post.content}</p>
            <div className="post-actions">
              <button className="comment-toggle-btn" onClick={() => toggleComments(post.id)}>
                💬 {activeComments[post.id] !== undefined
                  ? `Hide (${activeComments[post.id].length})`
                  : 'Comments'}
              </button>
            </div>

            {activeComments[post.id] !== undefined && (
              <div className="comments-section">
                <div className="comments-list">
                  {activeComments[post.id].length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No comments yet</p>
                  ) : activeComments[post.id].map(comment => (
                    <div key={comment.id} className="comment">
                      <strong>{comment.user_profiles?.name || 'Anonymous'}</strong>
                      <span> {comment.content}</span>
                      <div className="comment-time">{timeAgo(comment.created_at)}</div>
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
