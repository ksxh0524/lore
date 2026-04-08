import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../../src/llm/circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('should start closed', () => {
    const cb = new CircuitBreaker();
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState()).toBe('closed');
  });

  it('should open after reaching failure threshold', () => {
    const cb = new CircuitBreaker(5, 60000);
    for (let i = 0; i < 4; i++) cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    expect(cb.getState()).toBe('open');
  });

  it('should close after recordSuccess', () => {
    const cb = new CircuitBreaker(3, 60000);
    for (let i = 0; i < 3; i++) cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState()).toBe('closed');
  });

  it('should transition to half-open after resetTimeout', () => {
    const cb = new CircuitBreaker(3, 100);
    for (let i = 0; i < 3; i++) cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(cb.isOpen()).toBe(false);
        expect(cb.getState()).toBe('half-open');
        resolve();
      }, 150);
    });
  });

  it('should reset failures on success from half-open', () => {
    const cb = new CircuitBreaker(2, 50);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    return new Promise<void>(resolve => {
      setTimeout(async () => {
        expect(cb.isOpen()).toBe(false);
        cb.recordSuccess();
        expect(cb.getState()).toBe('closed');
        cb.recordFailure();
        expect(cb.isOpen()).toBe(false);
        resolve();
      }, 80);
    });
  });
});
