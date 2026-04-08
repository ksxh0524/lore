import { useState, type ReactNode } from 'react';
import { ios26 } from '../../../lib/ios26-tokens';

interface StatusBarProps {
  time?: string;
}

export function StatusBar({ time }: StatusBarProps) {
  const now = time ?? new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      height: 54,
      paddingLeft: 32,
      paddingRight: 20,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingBottom: 4,
      flexShrink: 0,
      color: ios26.colors.text.primary,
      fontSize: 15,
      fontWeight: 600,
      fontFamily: '-apple-system, SF Pro Display, system-ui, sans-serif',
    }}>
      <span>{now}</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 13 }}>
        <span style={{ fontSize: 14 }}>●●●●○</span>
        <span style={{ fontSize: 12 }}>WiFi</span>
        <span style={{ fontSize: 14 }}>🔋</span>
      </div>
    </div>
  );
}

interface NavBarItem {
  label: string;
  icon: string;
}

interface NavBarProps {
  title?: string;
  largeTitle?: string;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  translucent?: boolean;
}

export function NavBar({ title, largeTitle, leftAction, rightAction, translucent }: NavBarProps) {
  return (
    <div style={{
      flexShrink: 0,
      background: translucent ? ios26.colors.glass.dark : 'transparent',
      backdropFilter: translucent ? `blur(${ios26.blur.regular}px)` : undefined,
      WebkitBackdropFilter: translucent ? `blur(${ios26.blur.regular}px)` : undefined,
    }}>
      <div style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 16,
        paddingRight: 16,
        position: 'relative',
      }}>
        <div style={{ minWidth: 60, display: 'flex' }}>{leftAction}</div>
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: ios26.typography.headline.size,
          fontWeight: ios26.typography.headline.weight,
          color: ios26.colors.text.primary,
          letterSpacing: ios26.typography.headline.tracking,
        }}>{title}</div>
        <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>{rightAction}</div>
      </div>
      {largeTitle && (
        <div style={{
          paddingLeft: 16, paddingRight: 16, paddingBottom: 8,
          fontSize: ios26.typography.largeTitle.size,
          fontWeight: ios26.typography.largeTitle.weight,
          letterSpacing: ios26.typography.largeTitle.tracking,
          color: ios26.colors.text.primary,
        }}>{largeTitle}</div>
      )}
    </div>
  );
}

interface TabBarProps {
  items: NavBarItem[];
  activeIndex: number;
  onTabChange: (index: number) => void;
}

export function TabBar({ items, activeIndex, onTabChange }: TabBarProps) {
  return (
    <div style={{
      height: 83,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingTop: 6,
      background: ios26.colors.glass.darkHeavy,
      backdropFilter: `blur(${ios26.blur.prominent}px)`,
      WebkitBackdropFilter: `blur(${ios26.blur.prominent}px)`,
      borderTop: `0.5px solid ${ios26.colors.separator}`,
    }}>
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => onTabChange(i)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            cursor: 'pointer', padding: '2px 12px',
            transition: `opacity ${ios26.animation.duration.fast}ms ${ios26.animation.easeOut}`,
          }}
        >
          <span style={{
            fontSize: 24,
            opacity: activeIndex === i ? 1 : 0.4,
            filter: activeIndex === i ? 'none' : 'grayscale(1)',
            transition: `all ${ios26.animation.duration.normal}ms ${ios26.animation.spring}`,
          }}>{item.icon}</span>
          <span style={{
            fontSize: ios26.typography.caption1.size,
            color: activeIndex === i ? ios26.colors.system.blue : ios26.colors.text.tertiary,
            fontWeight: activeIndex === i ? 600 : 400,
            letterSpacing: ios26.typography.caption1.tracking,
          }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function IOSScreen({ children }: { children: ReactNode }) {
  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      fontFamily: '-apple-system, SF Pro Display, SF Pro Text, system-ui, sans-serif',
      color: ios26.colors.text.primary,
      WebkitOverflowScrolling: 'touch',
    }}>
      {children}
    </div>
  );
}
