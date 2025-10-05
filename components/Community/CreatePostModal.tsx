import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

const CreatePostModal: React.FC<Props> = ({ onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');

  const postTags = [
    { value: '', label: 'No tag' },
    { value: 'missing-pet', label: 'Missing Pet', color: '#e74c3c' },
    { value: 'advice-needed', label: 'Advice Needed', color: '#f39c12' },
    { value: 'babysitter-wanted', label: 'Pet Sitter Wanted', color: '#9b59b6' },
    { value: 'found-pet', label: 'Found Pet', color: '#27ae60' },
    { value: 'adoption', label: 'Adoption', color: '#3498db' },
    { value: 'general', label: 'General', color: '#95a5a6' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFileError(null);
    
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        setFileError('Please select an image file');
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setFileError('Image must be smaller than 10MB');
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (fileError) return;
    
    const formData = new FormData();
    formData.append('postText', text.trim());
    if (file) formData.append('image', file);
    if (selectedTag) formData.append('tag', selectedTag);
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--border-radius)', padding: 24, width: '90%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid rgba(204, 153, 102, 0.2)' }}>
        <div style={{ fontWeight: 700, marginBottom: 20, fontSize: '1.5rem', color: 'var(--accent-color)', textAlign: 'center' }}>Create Post</div>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          style={{ 
            width: '100%', 
            padding: '16px 20px', 
            borderRadius: '25px', 
            border: '2px solid rgba(204, 153, 102, 0.3)', 
            marginBottom: 16,
            resize: 'vertical',
            minHeight: '100px',
            fontSize: '16px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.3s ease',
            background: 'white'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-color)';
            e.target.style.boxShadow = '0 0 0 3px rgba(204, 153, 102, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(204, 153, 102, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />

        {/* Tag Selection */}
        <div style={{ marginBottom: 20, padding: '16px', background: 'linear-gradient(135deg, rgba(204, 153, 102, 0.05), rgba(204, 153, 102, 0.1))', borderRadius: 'var(--border-radius)', border: '1px solid rgba(204, 153, 102, 0.2)' }}>
          <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Post Category (Optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {postTags.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => setSelectedTag(tag.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: selectedTag === tag.value ? `2px solid ${tag.color}` : '2px solid rgba(204, 153, 102, 0.3)',
                  background: selectedTag === tag.value ? `linear-gradient(135deg, ${tag.color}, ${tag.color}dd)` : 'white',
                  color: selectedTag === tag.value ? 'white' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: selectedTag === tag.value ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: selectedTag === tag.value ? `0 4px 12px ${tag.color}40` : '0 2px 5px rgba(0,0,0,0.1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  if (selectedTag !== tag.value) {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(-2px)';
                    target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTag !== tag.value) {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* File input and preview */}
        <div style={{ marginBottom: 12 }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            style={{ marginBottom: 8 }}
            id="image-upload"
          />
          
          {fileError && (
            <div style={{ color: '#e74c3c', fontSize: '14px', marginBottom: 8 }}>
              {fileError}
            </div>
          )}
          
          {previewUrl && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  maxHeight: '200px', 
                  objectFit: 'cover', 
                  borderRadius: 8,
                  border: '1px solid #ddd'
                }}
              />
              <button
                onClick={removeFile}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px'
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'linear-gradient(135deg, #6c757d, #5a6268)', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '25px', 
              cursor: 'pointer',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLButtonElement;
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 5px 15px rgba(108, 117, 125, 0.4)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLButtonElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = '0 3px 10px rgba(0,0,0,0.15)';
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !!fileError} 
            style={{ 
              background: isSubmitting || !!fileError ? 'linear-gradient(135deg, #6c757d, #5a6268)' : 'linear-gradient(135deg, var(--accent-color), var(--accent-dark))', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '25px', 
              cursor: isSubmitting || !!fileError ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSubmitting || !!fileError ? '0 2px 5px rgba(0,0,0,0.1)' : '0 3px 10px rgba(204, 153, 102, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !fileError) {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 5px 15px rgba(204, 153, 102, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !fileError) {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 3px 10px rgba(204, 153, 102, 0.3)';
              }
            }}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;


