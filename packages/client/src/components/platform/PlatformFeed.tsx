import { useState } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import type { CSSProperties } from 'react';

export function PlatformFeed() {
  const [posts, setPosts] = useState<Array<{ id: string; content: string; author: string; likes: number }>>([]);
  const [newPostContent, setNewPostContent] = useState('');

  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost = {
      id: Math.random().toString(),
      content: newPostContent.trim(),
      author: '玩家',
      likes: 0,
    };
    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  return (
    <div style={containerStyles}>
      <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontWeight: 600 }}>📱 虚拟平台</h3>
      </div>
      
      <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)' }}>
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="发布一条动态..."
          style={{
            width: '100%',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            minHeight: '60px',
            resize: 'vertical',
          }}
        />
        <button
          onClick={handleCreatePost}
          disabled={!newPostContent.trim()}
          style={{
            marginTop: 'var(--space-sm)',
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent-primary)',
            color: '#fff',
            cursor: newPostContent.trim() ? 'pointer' : 'not-allowed',
            opacity: newPostContent.trim() ? 1 : 0.5,
          }}
        >
          发布
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
            暂无动态
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              marginBottom: 'var(--space-md)',
            }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }}>
                {post.author}
              </div>
              <div style={{ marginBottom: 'var(--space-sm)' }}>{post.content}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                ❤️ {post.likes}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
