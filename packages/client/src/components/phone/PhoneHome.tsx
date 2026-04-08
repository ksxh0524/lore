import { useState } from 'react';
import { ios26 } from '../../lib/ios26-tokens';
import { StatusBar } from './system/IOSComponents';
import { PhoneShell } from '../device/phone/PhoneShell';
import { PhoneChatApp } from './apps/ChatApp';
import { PhoneSocialApp } from './apps/SocialApp';
import { PhoneContactsApp } from './apps/ContactsApp';

interface AppDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  component: React.FC<{ onBack: () => void }> | null;
}

const apps: AppDef[] = [
  { id: 'chat', name: '信息', icon: '💬', color: ios26.colors.system.green, component: PhoneChatApp as any },
  { id: 'social', name: '动态', icon: '📱', color: ios26.colors.system.orange, component: PhoneSocialApp as any },
  { id: 'contacts', name: '通讯录', icon: '👤', color: ios26.colors.system.blue, component: PhoneContactsApp as any },
  { id: 'phone', name: '电话', icon: '📞', color: ios26.colors.system.green, component: null },
  { id: 'camera', name: '相机', icon: '📷', color: ios26.colors.background.tertiary, component: null },
  { id: 'photos', name: '照片', icon: '🌈', color: ios26.colors.system.purple, component: null },
  { id: 'maps', name: '地图', icon: '🗺️', color: ios26.colors.system.teal, component: null },
  { id: 'weather', name: '天气', icon: '🌤️', color: ios26.colors.system.blue, component: null },
  { id: 'clock', name: '时钟', icon: '🕐', color: ios26.colors.background.tertiary, component: null },
  { id: 'notes', name: '备忘录', icon: '📝', color: ios26.colors.system.yellow, component: null },
  { id: 'settings', name: '设置', icon: '⚙️', color: ios26.colors.background.tertiary, component: null },
  { id: 'wallet', name: '钱包', icon: '💳', color: ios26.colors.background.tertiary, component: null },
];

const dockApps = apps.slice(0, 4);
const gridApps = apps.slice(4);

export function IPhone({ wallpaper }: { wallpaper?: string }) {
  const [openApp, setOpenApp] = useState<string | null>(null);
  const [screenLocked, setScreenLocked] = useState(false);

  const app = openApp ? apps.find(a => a.id === openApp) : null;
  const AppComponent = app?.component;

  return (
    <PhoneShell wallpaper={wallpaper}>
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {screenLocked ? (
          <div
            onClick={() => setScreenLocked(false)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <StatusBar />
            <div style={{
              fontSize: 72, fontWeight: 200, color: ios26.colors.text.primary,
              fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
              letterSpacing: -2, marginTop: 40,
            }}>
              {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: ios26.typography.title3.size, color: ios26.colors.text.secondary, marginTop: 8 }}>
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div style={{ marginTop: 'auto', marginBottom: 40, fontSize: ios26.typography.subhead.size, color: ios26.colors.text.tertiary }}>
              轻点解锁
            </div>
          </div>
        ) : openApp && AppComponent ? (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: ios26.colors.background.primary,
            display: 'flex', flexDirection: 'column',
            animation: `iosAppOpen ${ios26.animation.duration.normal}ms ${ios26.animation.spring}`,
          }}>
            <AppComponent onBack={() => setOpenApp(null)} />
          </div>
        ) : (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <StatusBar />
            </div>
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', paddingTop: 60, paddingBottom: 100,
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 20, padding: '0 22px',
              }}>
                {gridApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => app.component && setOpenApp(app.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: app.component ? 'pointer' : 'default' }}
                  >
                    <div style={{
                      width: 60, height: 60, borderRadius: ios26.radius.medium,
                      background: ios26.colors.glass.darkMedium,
                      backdropFilter: `blur(${ios26.blur.regular}px)`,
                      WebkitBackdropFilter: `blur(${ios26.blur.regular}px)`,
                      border: `0.5px solid ${ios26.colors.separator}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 30,
                      boxShadow: ios26.shadow.glass,
                    }}>{app.icon}</div>
                    <span style={{
                      fontSize: ios26.typography.caption1.size,
                      color: ios26.colors.text.primary,
                      letterSpacing: ios26.typography.caption1.tracking,
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}>{app.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '12px 22px 32px',
              background: ios26.colors.glass.darkHeavy,
              backdropFilter: `blur(${ios26.blur.prominent}px)`,
              WebkitBackdropFilter: `blur(${ios26.blur.prominent}px)`,
              borderTop: `0.5px solid ${ios26.colors.separator}`,
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}>
              {dockApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => app.component && setOpenApp(app.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: app.component ? 'pointer' : 'default' }}
                >
                  <div style={{
                    width: 60, height: 60, borderRadius: ios26.radius.medium,
                    background: ios26.colors.glass.darkMedium,
                    backdropFilter: `blur(${ios26.blur.regular}px)`,
                    WebkitBackdropFilter: `blur(${ios26.blur.regular}px)`,
                    border: `0.5px solid ${ios26.colors.separator}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 30,
                    boxShadow: ios26.shadow.glass,
                  }}>{app.icon}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PhoneShell>
  );
}
