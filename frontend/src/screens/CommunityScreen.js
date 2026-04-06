import React, { useState, useEffect, useCallback } from 'react';
import { getCommunityPosts, saveCommunityPost, subscribeToCommunityPosts, getComments, saveComment, subscribeToComments } from '../services/supabase';
import './CommunityScreen.css';

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`;
}

export function CommunityScreen({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeComments, setActiveComments] = useState({});
  const [newComments, setNewComments] = useState({});

  const loadPosts = useCallback(async () => {
    const { data } = await getCommunityPosts(50);
    if (data) {
      setPosts(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
    const channel = subscribeToCommunityPosts(async () => {
      loadPosts();
    });
    return () => { if (channel) channel.unsubscribe(); };
  }, [loadPosts]);

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;
    setSubmitting(true);
    
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         async (pos) => {
           await saveCommunityPost({ 
              userId: user?.id, 
              content: newPostContent, 
              location: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
           });
           setNewPostContent('');
           setSubmitting(false);
         },
         async () => {
            await saveCommunityPost({ userId: user?.id, content: newPostContent, location: null });
            setNewPostContent('');
            setSubmitting(false);
         }
       );
    } else {
        await saveCommunityPost({ userId: user?.id, content: newPostContent, location: null });
        setNewPostContent('');
        setSubmitting(false);
    }
  };

  const loadCommentsForPost = async (postId) => {
    const { data } = await getComments(postId);
    if (data) {
      setActiveComments(prev => ({ ...prev, [postId]: data }));
    }
    
    subscribeToComments(postId, () => {
      getComments(postId).then(res => {
         if (res.data) setActiveComments(prev => ({ ...prev, [postId]: res.data }));
      });
    });
  };

  const toggleComments = (postId) => {
    if (activeComments[postId]) {
      const newActive = {...activeComments};
      delete newActive[postId];
      setActiveComments(newActive);
    } else {
      loadCommentsForPost(postId);
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!newComments[postId]?.trim()) return;
    await saveComment({ postId, userId: user?.id, content: newComments[postId] });
    setNewComments(prev => ({ ...prev, [postId]: '' }));
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
          <button className="btn btn-primary" onClick={handlePostSubmit} disabled={submitting || !newPostContent}>
             {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

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
             <p>No community posts yet.</p>
          </div>
        ) : posts.map(post => (
           <div key={post.id} className="post-card card">
               <div className="post-header">
                  <strong>{post.user_profiles?.name || 'Anonymous User'}</strong>
                  <span className="post-time">{timeAgo(post.created_at)}</span>
               </div>
               <p className="post-content">{post.content}</p>
               <div className="post-actions">
                  <button className="comment-toggle-btn" onClick={() => toggleComments(post.id)}>
                     💬 Comments {activeComments[post.id] === undefined ? '' : `(${activeComments[post.id].length})`}
                  </button>
               </div>
               {activeComments[post.id] !== undefined && (
                  <div className="comments-section">
                     <div className="comments-list">
                        {activeComments[post.id].map(comment => (
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
                         onChange={e => setNewComments(prev => ({...prev, [post.id]: e.target.value}))}
                       />
                       <button className="btn btn-secondary send-comment-btn" onClick={() => handleCommentSubmit(post.id)}>Send</button>
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
