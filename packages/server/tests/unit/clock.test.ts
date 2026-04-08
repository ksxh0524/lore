import { describe, it, expect } from 'vitest';
import { WorldClock } from '../../src/world/clock.js';

describe('WorldClock', () => {
  it('should initialize with given time', () => {
    const now = new Date('2024-01-01T08:00:00');
    const clock = new WorldClock(now, 1);
    expect(clock.getTime()).toEqual(now);
  });

  it('should advance time by tickInterval * speed', () => {
    const now = new Date('2024-01-01T08:00:00');
    const clock = new WorldClock(now, 60);
    clock.advance(3000);
    expect(clock.getTime().getTime() - now.getTime()).toBe(3000 * 60);
  });

  it('should clamp timeSpeed between 0.1 and 100', () => {
    const clock = new WorldClock(new Date(), 1);
    clock.setTimeSpeed(200);
    expect(clock.getTimeSpeed()).toBe(100);
    clock.setTimeSpeed(0);
    expect(clock.getTimeSpeed()).toBe(0.1);
  });

  it('should calculate day correctly', () => {
    const clock = new WorldClock(new Date('2024-01-01T00:00:00'), 1);
    expect(clock.getDay()).toBeGreaterThan(0);
  });
});
