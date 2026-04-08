import { useState } from 'react';
import { MBPShell, MacMenuBar, MacDock, MacWindow } from './MacShell';
import { ios26 } from '../../../lib/ios26-tokens';

const dockApps = [
  { id: 'finder', icon: '📁', name: 'Finder' },
  { id: 'browser', icon: '🧭', name: 'Safari' },
  { id: 'terminal', icon: '🖥️', name: '终端' },
  { id: 'notes', icon: '📝', name: '备忘录' },
  { id: 'messages', icon: '💬', name: '信息' },
  { id: 'mail', icon: '📧', name: '邮件' },
  { id: 'monitor', icon: '📊', name: '活动监视器' },
];

function FinderApp() {
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif' }}>
      <div style={{ width: 160, background: 'rgba(40,40,42,0.6)', padding: '10px 0', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
        {['收藏', '桌面', '文稿', '下载', '应用程序'].map((item, i) => (
          <div key={item} style={{
            padding: '5px 14px', fontSize: 12,
            color: i === 0 ? ios26.colors.text.primary : ios26.colors.text.secondary,
            background: i === 0 ? 'rgba(10,132,255,0.25)' : 'transparent',
            borderRadius: 5, margin: '1px 6px', cursor: 'pointer',
          }}>{item}</div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignContent: 'start' }}>
        {['项目报告.pdf', '工作计划.docx', '会议记录.md', '预算表.xlsx', '照片备份', '代码仓库'].map((f) => (
          <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6, borderRadius: 6, cursor: 'pointer' }}>
            <div style={{ fontSize: 32 }}>📄</div>
            <span style={{ fontSize: 10, color: ios26.colors.text.secondary, textAlign: 'center' }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrowserApp() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif' }}>
      <div style={{
        padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center',
        background: 'rgba(40,40,42,0.5)', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: 3 }}>
          <span style={{ color: ios26.colors.text.tertiary, cursor: 'pointer' }}>‹</span>
          <span style={{ color: ios26.colors.text.tertiary, cursor: 'pointer' }}>›</span>
        </div>
        <div style={{
          flex: 1, padding: '5px 10px', borderRadius: 6,
          background: 'rgba(120,120,128,0.24)', fontSize: 12,
          color: ios26.colors.text.secondary, textAlign: 'center',
        }}>lore://world</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, padding: 24 }}>
        <div style={{ fontSize: 40 }}>🌐</div>
        <div style={{ fontSize: ios26.typography.title3.size, color: ios26.colors.text.primary, fontWeight: 600 }}>Lore 世界浏览器</div>
        <div style={{ fontSize: ios26.typography.footnote.size, color: ios26.colors.text.tertiary }}>浏览世界信息、事件、Agent 数据</div>
      </div>
    </div>
  );
}

function MonitorApp() {
  return (
    <div style={{ padding: 14, fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: ios26.typography.headline.size, fontWeight: 600, color: ios26.colors.text.primary }}>活动监视器</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Agent 数', value: '8', color: ios26.colors.system.blue },
          { label: 'Tick', value: '#142', color: ios26.colors.system.green },
          { label: '事件', value: '23', color: ios26.colors.system.orange },
          { label: 'LLM 调用', value: '47', color: ios26.colors.system.purple },
          { label: '消息', value: '156', color: ios26.colors.system.teal },
          { label: '内存', value: '128MB', color: ios26.colors.system.red },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: 10, borderRadius: 8,
            background: 'rgba(120,120,128,0.12)',
            border: '0.5px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 10, color: ios26.colors.text.tertiary, marginBottom: 3 }}>{stat.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const appComponents: Record<string, { component: React.FC; title: string }> = {
  finder: { component: FinderApp, title: 'Finder' },
  browser: { component: BrowserApp, title: 'Safari' },
  monitor: { component: MonitorApp, title: '活动监视器' },
};

export function MacBookPro() {
  const [activeApp, setActiveApp] = useState<string | null>(null);

  const openApp = (id: string) => {
    if (appComponents[id]) {
      setActiveApp(activeApp === id ? null : id);
    }
  };

  const app = activeApp ? appComponents[activeApp] : null;
  const AppComp = app?.component;

  return (
    <MBPShell onLidChange={() => setActiveApp(null)}>
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <MacMenuBar activeApp={app?.title} />
        <div style={{
          flex: 1, position: 'relative',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {app && AppComp ? (
            <MacWindow title={app.title} onClose={() => setActiveApp(null)} width={600} height={340}>
              <AppComp />
            </MacWindow>
          ) : (
            <div style={{ textAlign: 'center', color: ios26.colors.text.tertiary }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>💻</div>
              <div style={{ fontSize: ios26.typography.callout.size, fontWeight: 500 }}>点击 Dock 打开应用</div>
            </div>
          )}
          <MacDock apps={dockApps} activeApp={activeApp ?? undefined} onOpen={openApp} />
        </div>
      </div>
    </MBPShell>
  );
}
