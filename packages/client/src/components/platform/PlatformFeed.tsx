import { useState, useEffect } from 'react';
import { useWorldStore } from '../../stores/worldStore';
import { api } from '../../services/api';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  views: number;
  timestamp: string;
  commentsList?: Array<{ author: string; content: string }>;
}

const platforms = [
  { id: 'all', name: '全部', icon: '📱' },
  { id: 'twitter', name: 'Twitter', icon: '🐦' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
];

export function PlatformFeed() {
  const worldId = useWorldStore((s) => s.worldId);
  const agents = useWorldStore((s) => s.agents);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activePlatform, setActivePlatform] = useState('all');
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!worldId) return;
    api.getPlatforms(worldId).then(setPosts).catch(() => {});
  }, [worldId]);

  const handlePost = async () => {
    if (!newPostContent.trim() || !worldId) return;
    setPosting(true);
    try {
      const newPost = await api.createPost(worldId, newPostContent.trim());
      setPosts([newPost, ...posts]);
      setNewPostContent('');
    } catch (err) {
      alert(err instanceof Error ? err.message : '发布失败');
    } finally {
      setPosting(false);
    }
  };

  const getAuthorName = (authorId: string) => {
    const agent = agents.find((a) => a.id === authorId);
    return agent?.profile?.name || '用户';
  };

  const filteredPosts =
    activePlatform === 'all'
      ? posts
      : posts.filter((p: any) => p.platform === activePlatform);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #1a1a25',
        }}
      >
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: activePlatform === p.id ? '#6366f1' : '#1a1a25',
              color: '#f0f0f5',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>{p.icon}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a25' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="发布一条动态..."
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #333',
              background: '#1a1a25',
              color: '#f0f0f5',
              fontSize: '0.9rem',
            }}
          />
          <button
            onClick={handlePost}
            disabled={posting || !newPostContent.trim()}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: posting || !newPostContent.trim() ? '#333' : '#6366f1',
              color: '#fff',
              cursor: posting ? 'wait' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            发布
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1rem' }}>
        {filteredPosts.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#555570',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
            <div>暂无动态</div>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              style={{
                background: '#12121a',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {getAuthorName(post.authorId)[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {getAuthorName(post.authorId)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#555570' }}>
                    {new Date(post.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                {post.content}
              </div>

              {post.imageUrl && (
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    background: '#1a1a25',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#555570',
                    fontSize: '0.85rem',
                  }}
                >
                  [图片]
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#8888a0' }}>
                <span>👁 {post.views}</span>
                <span>❤️ {post.likes}</span>
                <span>💬 {post.comments}</span>
              </div>

              {post.commentsList && post.commentsList.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1a1a25' }}>
                  {post.commentsList.map((c, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 500 }}>{c.author}：</span>
                      {c.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
