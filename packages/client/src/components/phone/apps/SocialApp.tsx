import { useState } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';
import { StatusBar, NavBar, IOSScreen, TabBar } from '../system/IOSComponents';

const mockPosts = [
  { id: '1', author: '小美', avatar: '👩', content: '今天天气真好，出去散了个步 ☀️', time: '2小时前', likes: 12, comments: 3, liked: false },
  { id: '2', author: '阿杰', avatar: '👨', content: '刚完成了一个项目，庆祝一下！🎉', time: '5小时前', likes: 8, comments: 1, liked: true },
  { id: '3', author: '王姐', avatar: '👩‍🦰', content: '分享一首歌，最近单曲循环中 🎵', time: '昨天', likes: 24, comments: 7, liked: false },
];

export function PhoneSocialApp() {
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState(mockPosts);

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p,
    ));
  };

  return (
    <>
      <StatusBar />
      <NavBar largeTitle="动态" translucent rightAction={
        <div style={{ color: ios26.colors.system.blue, cursor: 'pointer', fontSize: 20 }}>📷</div>
      } />
      <IOSScreen>
        <div style={{ padding: '0 16px' }}>
          {posts.map((post) => (
            <div key={post.id} style={{
              padding: '16px 0',
              borderBottom: `0.5px solid ${ios26.colors.separator}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: ios26.colors.fill.tertiary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>{post.avatar}</div>
                <div>
                  <div style={{ fontSize: ios26.typography.headline.size, fontWeight: ios26.typography.headline.weight, letterSpacing: ios26.typography.headline.tracking }}>
                    {post.author}
                  </div>
                  <div style={{ fontSize: ios26.typography.caption1.size, color: ios26.colors.text.tertiary, letterSpacing: ios26.typography.caption1.tracking }}>
                    {post.time}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: ios26.typography.body.size,
                letterSpacing: ios26.typography.body.tracking,
                lineHeight: 1.5,
                marginBottom: 12,
                paddingLeft: 50,
              }}>
                {post.content}
              </div>
              <div style={{ display: 'flex', gap: 24, paddingLeft: 50 }}>
                <div
                  onClick={() => toggleLike(post.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: ios26.typography.footnote.size, color: post.liked ? ios26.colors.system.red : ios26.colors.text.secondary }}
                >
                  <span>{post.liked ? '❤️' : '🤍'}</span> {post.likes}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: ios26.typography.footnote.size, color: ios26.colors.text.secondary, cursor: 'pointer' }}>
                  <span>💬</span> {post.comments}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: ios26.typography.footnote.size, color: ios26.colors.text.secondary, cursor: 'pointer' }}>
                  <span>🔄</span> 分享
                </div>
              </div>
            </div>
          ))}
        </div>
      </IOSScreen>
      <TabBar
        items={[
          { label: '动态', icon: '📱' },
          { label: '发现', icon: '🔍' },
          { label: '消息', icon: '💬' },
          { label: '我的', icon: '👤' },
        ]}
        activeIndex={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
