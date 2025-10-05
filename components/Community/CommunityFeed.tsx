import React, { useEffect, useState } from 'react';
import { CommunityPost } from '../../types';
import { createPost, fetchPosts, likePost, deletePost } from '../../services/CommunityApi';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import AuthService from '../../services/AuthService';

const CommunityFeed: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchPosts();
      // sort by timestamp desc (server should already do this)
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPosts(data);
    } catch (e) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load();
    // Get current user ID
    const getCurrentUser = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
      }
    };
    getCurrentUser();
  }, []);

  const handleLike = async (id: string) => {
    try {
      const res = await likePost(id);
      setPosts((prev) => prev.map(p => p.id === id ? { ...p, likes: res.likes } : p));
    } catch (e) {
    }
  };

  const handleCreate = async (formData: FormData) => {
    const created = await createPost(formData);
    setPosts((prev) => [created, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter(p => p.id !== id));
    } catch (error) {
    }
  };

  return (
    <div className="community-feed" style={{ padding: 16 }}>
      <div className="dashboard-header" style={{ marginBottom: 12 }}>
        <h1>Community</h1>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button 
          onClick={() => setShowCreate(true)} 
          style={{ 
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-dark))', 
            color: 'white', 
            border: 'none', 
            padding: '12px 24px', 
            borderRadius: '25px', 
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 3px 10px rgba(204, 153, 102, 0.3)'
          }}
          onMouseEnter={(e) => {
            const target = e.currentTarget as HTMLButtonElement;
            target.style.transform = 'translateY(-2px)';
            target.style.boxShadow = '0 5px 15px rgba(204, 153, 102, 0.4)';
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget as HTMLButtonElement;
            target.style.transform = 'translateY(0)';
            target.style.boxShadow = '0 3px 10px rgba(204, 153, 102, 0.3)';
          }}
        >
          Create Post
        </button>
      </div>
      {loading && <div>Loading posts...</div>}
      {error && <div style={{ color: 'var(--danger-color)' }}>{error}</div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {posts.map(p => (
          <PostCard 
            key={p.id} 
            post={p} 
            onLike={handleLike} 
            onDelete={handleDelete}
            currentUserId={currentUserId || undefined}
          />
        ))}
      </div>
      {showCreate && (
        <CreatePostModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
      )}
    </div>
  );
};

export default CommunityFeed;


