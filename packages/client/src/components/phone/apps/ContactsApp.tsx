import { useState } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';
import { StatusBar, NavBar, IOSScreen, TabBar } from '../system/IOSComponents';

const mockContacts = [
  { id: '1', name: '阿杰', avatar: '👨', type: 'friend', intimacy: 45 },
  { id: '2', name: '小美', avatar: '👩', type: 'close_friend', intimacy: 78 },
  { id: '3', name: '王姐', avatar: '👩‍🦰', type: 'friend', intimacy: 35 },
  { id: '4', name: '老陈', avatar: '🧔', type: 'acquaintance', intimacy: 15 },
  { id: '5', name: '小李', avatar: '👦', type: 'colleague', intimacy: 28 },
];

const typeLabels: Record<string, string> = {
  stranger: '陌生人',
  acquaintance: '认识',
  friend: '朋友',
  close_friend: '好友',
  partner: '伴侣',
  colleague: '同事',
  family: '家人',
  enemy: '敌人',
};

const typeColors: Record<string, string> = {
  stranger: ios26.colors.text.tertiary,
  acquaintance: ios26.colors.system.teal,
  friend: ios26.colors.system.blue,
  close_friend: ios26.colors.system.purple,
  partner: ios26.colors.system.pink,
  colleague: ios26.colors.system.orange,
  family: ios26.colors.system.green,
  enemy: ios26.colors.system.red,
};

export function PhoneContactsApp() {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const contact = selectedContact ? mockContacts.find(c => c.id === selectedContact) : null;

  if (contact) {
    return (
      <>
        <StatusBar />
        <NavBar title={contact.name} translucent leftAction={
          <div onClick={() => setSelectedContact(null)} style={{ color: ios26.colors.system.blue, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>‹</span><span>返回</span>
          </div>
        } />
        <IOSScreen>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: ios26.colors.fill.tertiary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, marginBottom: 12,
            }}>{contact.avatar}</div>
            <div style={{ fontSize: ios26.typography.title1.size, fontWeight: ios26.typography.title1.weight, letterSpacing: ios26.typography.title1.tracking, marginBottom: 4 }}>
              {contact.name}
            </div>
            <div style={{ fontSize: ios26.typography.subhead.size, color: typeColors[contact.type] ?? ios26.colors.text.secondary, marginBottom: 20 }}>
              {typeLabels[contact.type] ?? contact.type} · 亲密度 {contact.intimacy}
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
              {[
                { icon: '💬', label: '发消息' },
                { icon: '📞', label: '语音' },
                { icon: '📹', label: '视频' },
                { icon: '🤝', label: '打招呼' },
              ].map((action) => (
                <div key={action.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 26,
                    background: ios26.colors.glass.darkMedium,
                    backdropFilter: `blur(${ios26.blur.regular}px)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, border: `0.5px solid ${ios26.colors.separator}`,
                  }}>{action.icon}</div>
                  <span style={{ fontSize: ios26.typography.caption1.size, color: ios26.colors.system.blue, letterSpacing: ios26.typography.caption1.tracking }}>{action.label}</span>
                </div>
              ))}
            </div>
            <div style={{ width: '100%', background: ios26.colors.glass.darkMedium, backdropFilter: `blur(${ios26.blur.regular}px)`, borderRadius: ios26.radius.large, overflow: 'hidden', border: `0.5px solid ${ios26.colors.separator}` }}>
              {[
                { label: '关系状态', value: typeLabels[contact.type] },
                { label: '亲密度', value: `${contact.intimacy}/100` },
                { label: '最近互动', value: '今天 12:30' },
              ].map((row, i) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: i < 2 ? `0.5px solid ${ios26.colors.separator}` : 'none',
                }}>
                  <span style={{ fontSize: ios26.typography.body.size, color: ios26.colors.text.secondary, letterSpacing: ios26.typography.body.tracking }}>{row.label}</span>
                  <span style={{ fontSize: ios26.typography.body.size, color: ios26.colors.text.primary, letterSpacing: ios26.typography.body.tracking }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </IOSScreen>
        <TabBar items={[{ label: '通讯录', icon: '👤' }, { label: '好友', icon: '💛' }, { label: '我的', icon: '⚙️' }]} activeIndex={activeTab} onTabChange={setActiveTab} />
      </>
    );
  }

  return (
    <>
      <StatusBar />
      <NavBar largeTitle="通讯录" translucent rightAction={
        <div style={{ color: ios26.colors.system.blue, cursor: 'pointer', fontSize: 20 }}>➕</div>
      } />
      <IOSScreen>
        <div style={{ padding: '0 16px' }}>
          {mockContacts.map((c) => (
            <div key={c.id} onClick={() => setSelectedContact(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: `0.5px solid ${ios26.colors.separator}`,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 23,
                background: ios26.colors.fill.tertiary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0,
              }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: ios26.typography.headline.size, fontWeight: ios26.typography.headline.weight, letterSpacing: ios26.typography.headline.tracking }}>
                  {c.name}
                </div>
                <div style={{ fontSize: ios26.typography.footnote.size, color: typeColors[c.type], letterSpacing: ios26.typography.footnote.tracking }}>
                  {typeLabels[c.type]}
                </div>
              </div>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: ios26.colors.fill.primary, overflow: 'hidden' }}>
                <div style={{ width: `${c.intimacy}%`, height: '100%', borderRadius: 2, background: typeColors[c.type] ?? ios26.colors.system.blue }} />
              </div>
            </div>
          ))}
        </div>
      </IOSScreen>
      <TabBar items={[{ label: '通讯录', icon: '👤' }, { label: '好友', icon: '💛' }, { label: '我的', icon: '⚙️' }]} activeIndex={activeTab} onTabChange={setActiveTab} />
    </>
  );
}
