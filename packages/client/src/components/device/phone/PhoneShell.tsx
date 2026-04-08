import type { ReactNode } from 'react';

const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;
const BEZEL = 8;
const CORNER = 52;
const NOTCH_WIDTH = 126;
const NOTCH_HEIGHT = 37;

interface PhoneShellProps {
  children: ReactNode;
  wallpaper?: string;
}

export function PhoneShell({ children, wallpaper }: PhoneShellProps) {
  return (
    <div style={{
      width: PHONE_WIDTH + BEZEL * 2,
      height: PHONE_HEIGHT + BEZEL * 2,
      background: '#1a1a1a',
      borderRadius: CORNER + BEZEL,
      padding: BEZEL,
      position: 'relative',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.3)',
      flexShrink: 0,
    }}>
      <div style={{
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        borderRadius: CORNER,
        overflow: 'hidden',
        position: 'relative',
        background: wallpaper ?? 'linear-gradient(145deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: NOTCH_WIDTH, height: NOTCH_HEIGHT, background: '#000', borderRadius: '0 0 22px 22px', zIndex: 100 }}>
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#1a1a2e', boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5)' }} />
        </div>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: BEZEL + 8, left: '50%', transform: 'translateX(-50%)', width: 140, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)' }} />
    </div>
  );
}
