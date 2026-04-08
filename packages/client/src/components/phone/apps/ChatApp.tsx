import { useState } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';
import { StatusBar, NavBar, IOSScreen, TabBar } from '../system/IOSComponents';

const mockChats = [
  { id: '1', name: '小美', lastMsg: '你在干嘛呀？', time: '12:30', unread: 2, avatar: '👩' },
  { id: '2', name: '阿杰', lastMsg: '明天一起吃饭吗', time: '11:45', unread: 0, avatar: '👨' },
  { id: '3', name: '王姐', lastMsg: '好的收到', time: '昨天', unread: 0, avatar: '👩‍🦰' },
  { id: '4', name: '老陈', lastMsg: '项目进度怎么样了？', time: '昨天', unread: 1, avatar: '🧔' },
];

const mockMessages = [
  { id: '1', from: 'other', text: '在吗？', time: '12:28' },
  { id: '2', from: 'other', text: '你在干嘛呀？', time: '12:30' },
];

interface PhoneChatAppProps {
  onBack?: () => void;
}

export function PhoneChatApp({ onBack }: PhoneChatAppProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  if (selectedChat) {
    const chat = mockChats.find(c => c.id === selectedChat);
    return (
      <>
        <StatusBar />
        <NavBar
          title={chat?.name ?? ''}
          translucent
          leftAction={
            <div onClick={() => setSelectedChat(null)} style={{ color: ios26.colors.system.blue, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>‹</span><span>返回</span>
            </div>
          }
        />
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mockMessages.map((msg) => (
            <div key={msg.id} style={{ alignSelf: msg.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: 20,
                background: msg.from === 'me' ? ios26.colors.system.blue : ios26.colors.glass.darkMedium,
                backdropFilter: msg.from === 'me' ? undefined : `blur(${ios26.blur.ultraThin}px)`,
                color: msg.from === 'me' ? '#fff' : ios26.colors.text.primary,
                fontSize: ios26.typography.body.size,
                lineHeight: 1.4,
                letterSpacing: ios26.typography.body.tracking,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          padding: '8px 16px',
          paddingBottom: 36,
          background: ios26.colors.glass.darkHeavy,
          backdropFilter: `blur(${ios26.blur.prominent}px)`,
          borderTop: `0.5px solid ${ios26.colors.separator}`,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="信息"
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 20,
              background: ios26.colors.fill.primary,
              border: 'none', outline: 'none',
              color: ios26.colors.text.primary,
              fontSize: ios26.typography.body.size,
              fontFamily: 'inherit',
            }}
          />
          <div style={{
            width: 34, height: 34, borderRadius: 17,
            background: ios26.colors.system.blue,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: '#fff',
          }}>↑</div>
        </div>
      </>
    );
  }

  return (
    <>
      <StatusBar />
      <NavBar largeTitle="信息" translucent rightAction={
        <div style={{ color: ios26.colors.system.blue, cursor: 'pointer', fontSize: 22 }}>✏️</div>
      } />
      <IOSScreen>
        <div style={{ padding: '0 16px' }}>
          {mockChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                borderBottom: `0.5px solid ${ios26.colors.separator}`,
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 50, height: 50, borderRadius: 25,
                background: ios26.colors.fill.tertiary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, flexShrink: 0,
              }}>{chat.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: ios26.typography.headline.size,
                  fontWeight: ios26.typography.headline.weight,
                  letterSpacing: ios26.typography.headline.tracking,
                }}>{chat.name}</div>
                <div style={{
                  fontSize: ios26.typography.subhead.size,
                  color: ios26.colors.text.secondary,
                  letterSpacing: ios26.typography.subhead.tracking,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{chat.lastMsg}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: ios26.typography.caption1.size, color: ios26.colors.text.tertiary, letterSpacing: ios26.typography.caption1.tracking }}>{chat.time}</div>
                {chat.unread > 0 && (
                  <div style={{
                    width: 20, height: 20, borderRadius: 10,
                    background: ios26.colors.system.blue,
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginLeft: 'auto', marginTop: 4,
                  }}>{chat.unread}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </IOSScreen>
      <TabBar
        items={[
          { label: '通讯录', icon: '👤' },
          { label: '信息', icon: '💬' },
          { label: '发现', icon: '🔍' },
          { label: '我的', icon: '⚙️' },
        ]}
        activeIndex={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
