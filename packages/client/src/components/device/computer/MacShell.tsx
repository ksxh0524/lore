import type { ReactNode } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';

const SCREEN_W = 800;
const SCREEN_H = 520;
const BEZEL = 10;
const CORNER = 12;

interface MacShellProps {
  children: ReactNode;
}

export function MacShell({ children }: MacShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: SCREEN_W + BEZEL * 2,
        background: '#2d2d2d',
        borderRadius: `${CORNER}px ${CORNER}px 0 0`,
        padding: `${BEZEL}px ${BEZEL}px 0`,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          height: 28,
          background: 'rgba(40,40,40,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: `${CORNER}px ${CORNER}px 0 0`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          gap: 7,
          marginBottom: 0,
        }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: '#27c93f' }} />
        </div>
        <div style={{
          width: SCREEN_W,
          height: SCREEN_H,
          background: '#1e1e20',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      </div>
      <div style={{
        width: SCREEN_W + 100,
        height: 20,
        background: 'linear-gradient(to bottom, #3a3a3a, #2d2d2d)',
        borderRadius: '0 0 8px 8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }} />
      <div style={{ width: 120, height: 6, borderRadius: 3, background: '#555', marginTop: -2 }} />
    </div>
  );
}

interface MacMenuBarProps {
  activeApp?: string;
  onAction?: (action: string) => void;
}

export function MacMenuBar({ activeApp }: MacMenuBarProps) {
  return (
    <div style={{
      height: 28,
      background: 'rgba(40,40,40,0.75)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 16,
      fontSize: 13,
      color: ios26.colors.text.primary,
      fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
      flexShrink: 0,
    }}>
      <span style={{ fontWeight: 700, marginRight: 16 }}>{activeApp ?? 'Finder'}</span>
      <span style={{ marginRight: 14, color: ios26.colors.text.secondary, cursor: 'pointer' }}>文件</span>
      <span style={{ marginRight: 14, color: ios26.colors.text.secondary, cursor: 'pointer' }}>编辑</span>
      <span style={{ marginRight: 14, color: ios26.colors.text.secondary, cursor: 'pointer' }}>视图</span>
      <span style={{ marginRight: 14, color: ios26.colors.text.secondary, cursor: 'pointer' }}>窗口</span>
      <span style={{ marginRight: 14, color: ios26.colors.text.secondary, cursor: 'pointer' }}>帮助</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: ios26.colors.text.secondary }}>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

interface MacDockProps {
  apps: Array<{ id: string; icon: string; name: string }>;
  activeApp?: string;
  onOpen: (id: string) => void;
}

export function MacDock({ apps, activeApp, onOpen }: MacDockProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 4, padding: '4px 8px',
      background: 'rgba(50,50,50,0.65)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderRadius: 18,
      border: '0.5px solid rgba(255,255,255,0.12)',
    }}>
      {apps.map((app) => (
        <div
          key={app.id}
          onClick={() => onOpen(app.id)}
          style={{
            width: 46, height: 46, borderRadius: 11,
            background: app.id === activeApp ? 'rgba(10,132,255,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, cursor: 'pointer',
            transition: `transform ${ios26.animation.duration.fast}ms ${ios26.animation.spring}`,
          }}
          title={app.name}
        >
          {app.icon}
          {app.id === activeApp && (
            <div style={{ position: 'absolute', bottom: -4, width: 5, height: 5, borderRadius: 2.5, background: ios26.colors.text.secondary }} />
          )}
        </div>
      ))}
    </div>
  );
}

interface MacWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  width?: number;
  height?: number;
}

export function MacWindow({ title, children, onClose, width = 640, height = 400 }: MacWindowProps) {
  return (
    <div style={{
      width, height,
      borderRadius: 10,
      background: 'rgba(30,30,32,0.96)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '0.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        height: 38,
        background: 'rgba(45,45,48,0.9)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 13,
        gap: 7,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div onClick={onClose} style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f56', cursor: 'pointer' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#27c93f' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: ios26.colors.text.secondary }}>{title}</div>
        <div style={{ width: 45 }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
