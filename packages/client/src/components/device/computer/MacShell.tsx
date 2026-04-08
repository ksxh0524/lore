import { useState, useEffect, type ReactNode } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';

const SCREEN_W = 720;
const SCREEN_H = 480;
const BEZEL = 8;
const CORNER = 10;
const BASE_H = 14;
const KEYBOARD_H = 18;

export function MBPShell({ children, onLidChange }: { children: ReactNode; onLidChange?: (open: boolean) => void }) {
  const [lidOpen, setLidOpen] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLidOpen(true);
      onLidChange?.(true);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const toggleLid = () => {
    if (animating) return;
    setAnimating(true);
    setLidOpen(prev => {
      const next = !prev;
      onLidChange?.(next);
      return next;
    });
    setTimeout(() => setAnimating(false), 900);
  };

  const lidAngle = lidOpen ? 110 : 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', perspective: 1200 }}>
      <div style={{
        position: 'relative',
        width: SCREEN_W + BEZEL * 2,
        transformStyle: 'preserve-3d',
      }}>
        <div
          onClick={toggleLid}
          style={{
            position: 'relative',
            transformOrigin: 'bottom center',
            transform: `rotateX(-${lidAngle}deg)`,
            transition: animating || !lidOpen
              ? 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
            transformStyle: 'preserve-3d',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: `${CORNER}px ${CORNER}px 2px 2px`,
            background: 'linear-gradient(180deg, #3a3a3c 0%, #2d2d2f 30%, #2a2a2c 100%)',
            boxShadow: lidOpen
              ? '0 -2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
              : 'none',
            transform: 'translateZ(-1px)',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) translateZ(-0.5px) rotateX(180deg)',
            fontSize: 32,
            opacity: lidOpen ? 0 : 0.15,
            transition: 'opacity 400ms',
            pointerEvents: 'none',
            color: '#fff',
          }}>&#xF8FF;</div>
          <div style={{
            padding: `${BEZEL}px ${BEZEL}px ${BEZEL}px`,
            borderRadius: `${CORNER}px ${CORNER}px 2px 2px`,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              height: 26,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              gap: 6,
              background: 'rgba(30,30,32,0.95)',
              borderRadius: '8px 8px 0 0',
            }}>
              <div style={{ width: 11, height: 11, borderRadius: 6, background: '#ff5f56' }} />
              <div style={{ width: 11, height: 11, borderRadius: 6, background: '#ffbd2e' }} />
              <div style={{ width: 11, height: 11, borderRadius: 6, background: '#27c93f' }} />
            </div>
            <div style={{
              width: SCREEN_W,
              height: SCREEN_H,
              background: '#1e1e20',
              overflow: 'hidden',
              borderRadius: '0 0 4px 4px',
              opacity: lidOpen ? 1 : 0,
              transition: 'opacity 500ms 200ms',
            }}>
              {children}
            </div>
          </div>
        </div>

        <div style={{
          width: SCREEN_W + BEZEL * 2,
          height: BASE_H + 2,
          background: 'linear-gradient(to bottom, #3a3a3c, #2d2d2f)',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 140,
            height: 3,
            borderRadius: '0 0 3px 3px',
            background: 'linear-gradient(to bottom, #555, #444)',
          }} />
        </div>
      </div>

      <div style={{
        width: SCREEN_W + BEZEL * 2 + 20,
        marginTop: -1,
      }}>
        <div style={{
          height: KEYBOARD_H,
          background: 'linear-gradient(to bottom, #2d2d2f 0%, #2a2a2c 50%, #252527 100%)',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '4px 24px',
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
          }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{
                flex: i === 6 ? 2 : 1,
                height: 6,
                borderRadius: 2,
                background: 'rgba(60,60,64,0.8)',
              }} />
            ))}
          </div>
          <div style={{
            padding: '2px 40px',
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
          }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                flex: i === 5 ? 2 : 1,
                height: 6,
                borderRadius: 2,
                background: 'rgba(60,60,64,0.8)',
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '2px 0',
          }}>
            <div style={{
              width: 120,
              height: 6,
              borderRadius: 2,
              background: 'rgba(60,60,64,0.6)',
            }} />
          </div>
        </div>

        <div style={{
          width: 180,
          height: 14,
          margin: '0 auto',
          borderRadius: '0 0 6px 6px',
          background: 'linear-gradient(to bottom, #252527, #2d2d2f)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  );
}

interface MacMenuBarProps {
  activeApp?: string;
}

export function MacMenuBar({ activeApp }: MacMenuBarProps) {
  return (
    <div style={{
      height: 26,
      background: 'rgba(40,40,40,0.75)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 16,
      fontSize: 12,
      color: ios26.colors.text.primary,
      fontFamily: '-apple-system, SF Pro Text, system-ui, sans-serif',
      flexShrink: 0,
    }}>
      <span style={{ fontWeight: 700, marginRight: 14, fontSize: 13 }}>{activeApp ?? 'Finder'}</span>
      <span style={{ marginRight: 12, color: ios26.colors.text.secondary, cursor: 'pointer' }}>文件</span>
      <span style={{ marginRight: 12, color: ios26.colors.text.secondary, cursor: 'pointer' }}>编辑</span>
      <span style={{ marginRight: 12, color: ios26.colors.text.secondary, cursor: 'pointer' }}>视图</span>
      <span style={{ marginRight: 12, color: ios26.colors.text.secondary, cursor: 'pointer' }}>窗口</span>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: ios26.colors.text.secondary }}>
        {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
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
      display: 'flex', gap: 3, padding: '3px 8px',
      background: 'rgba(50,50,50,0.6)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 16,
      border: '0.5px solid rgba(255,255,255,0.1)',
    }}>
      {apps.map((app) => (
        <div key={app.id} onClick={() => onOpen(app.id)} style={{
          width: 40, height: 40, borderRadius: 9,
          background: app.id === activeApp ? 'rgba(10,132,255,0.2)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, cursor: 'pointer', position: 'relative',
        }} title={app.name}>
          {app.icon}
          {app.id === activeApp && (
            <div style={{ position: 'absolute', bottom: -3, width: 4, height: 4, borderRadius: 2, background: ios26.colors.text.secondary }} />
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

export function MacWindow({ title, children, onClose, width = 600, height = 360 }: MacWindowProps) {
  return (
    <div style={{
      width, height,
      borderRadius: 10,
      background: 'rgba(30,30,32,0.96)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      border: '0.5px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        height: 36,
        background: 'rgba(45,45,48,0.9)',
        display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 7,
        borderBottom: '0.5px solid rgba(255,255,255,0.05)', flexShrink: 0,
      }}>
        <div onClick={onClose} style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f56', cursor: 'pointer' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: '#27c93f' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 500, color: ios26.colors.text.secondary }}>{title}</div>
        <div style={{ width: 45 }} />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
  );
}
