import React, { useState } from 'react';
import { CommunityPost } from '../../types';

interface Props {
  post: CommunityPost;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

const PostCard: React.FC<Props> = ({ post, onLike, onDelete, currentUserId }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const likeCount = post.likes?.length || 0;
  const timestamp = new Date(post.timestamp).toLocaleString();
  const isOwnPost = currentUserId && post.userID === currentUserId;

  const getTagInfo = (tagValue: string) => {
    const tagMap: { [key: string]: { label: string; color: string } } = {
      'missing-pet': { label: 'Missing Pet', color: '#e74c3c' },
      'advice-needed': { label: 'Advice Needed', color: '#f39c12' },
      'babysitter-wanted': { label: 'Pet Sitter Wanted', color: '#9b59b6' },
      'found-pet': { label: 'Found Pet', color: '#27ae60' },
      'adoption': { label: 'Adoption', color: '#3498db' },
      'general': { label: 'General', color: '#95a5a6' }
    };
    return tagMap[tagValue] || { label: tagValue, color: '#95a5a6' };
  };

  const tagInfo = post.tag ? getTagInfo(post.tag) : null;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(post.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '24px',
            borderRadius: 'var(--border-radius)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Delete Post
            </h3>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--accent-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--accent-color)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--accent-color)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c0392b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e74c3c';
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="post-card" style={{ 
        background: 'var(--card-bg)', 
        borderRadius: 'var(--border-radius)', 
        padding: '20px', 
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(204, 153, 102, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>{post.authorName}</div>
            {tagInfo && (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'white',
                  background: `linear-gradient(135deg, ${tagInfo.color}, ${tagInfo.color}dd)`,
                  boxShadow: `0 2px 8px ${tagInfo.color}40`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {tagInfo.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>{timestamp}</div>
            {isOwnPost && (
              <button
                onClick={handleDeleteClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e74c3c',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e74c3c20';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Delete post"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--text-primary)', marginBottom: 16, lineHeight: '1.6', fontSize: '15px' }}>{post.postText}</div>
        {post.imageURL && (
          <div style={{ marginBottom: 8 }}>
            <img 
              src={post.imageURL} 
              alt="Post image" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '400px',
                borderRadius: 8,
                objectFit: 'cover',
                cursor: 'pointer'
              }}
              onClick={() => window.open(post.imageURL, '_blank')}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        <button 
          onClick={() => onLike(post.id)} 
          style={{ 
            border: 'none', 
            background: 'linear-gradient(135deg, var(--accent-color), var(--accent-dark))', 
            color: 'white', 
            padding: '12px 20px', 
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
          ❤️ Like ({likeCount})
        </button>
      </div>
    </>
  );
};

export default PostCard;


