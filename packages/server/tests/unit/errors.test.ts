import { describe, it, expect } from 'vitest';
import { ErrorCode, LoreError, toHttpError } from '../../src/errors.js';

describe('ErrorCode', () => {
  it('should have correct numeric values', () => {
    expect(ErrorCode.WORLD_NOT_FOUND).toBe(1001);
    expect(ErrorCode.AGENT_NOT_FOUND).toBe(2001);
    expect(ErrorCode.LLM_API_ERROR).toBe(3001);
    expect(ErrorCode.CONFIG_INVALID).toBe(4001);
    expect(ErrorCode.DB_ERROR).toBe(5001);
    expect(ErrorCode.INTERNAL_ERROR).toBe(9001);
  });
});

describe('LoreError', () => {
  it('should carry code, statusCode, and message', () => {
    const err = new LoreError(ErrorCode.WORLD_NOT_FOUND, 'world gone', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('LoreError');
    expect(err.code).toBe(ErrorCode.WORLD_NOT_FOUND);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('world gone');
  });

  it('should default statusCode to 500', () => {
    const err = new LoreError(ErrorCode.INTERNAL_ERROR, 'oops');
    expect(err.statusCode).toBe(500);
  });

  it('should carry optional details', () => {
    const err = new LoreError(ErrorCode.LLM_API_ERROR, 'bad', 502, { provider: 'openai' });
    expect(err.details).toEqual({ provider: 'openai' });
  });
});

describe('toHttpError', () => {
  it('should map world codes to 404', () => {
    expect(toHttpError(ErrorCode.WORLD_NOT_FOUND)).toBe(404);
  });

  it('should map agent codes to 404', () => {
    expect(toHttpError(ErrorCode.AGENT_NOT_FOUND)).toBe(404);
  });

  it('should map llm codes to 502', () => {
    expect(toHttpError(ErrorCode.LLM_API_ERROR)).toBe(502);
  });

  it('should map config codes to 400', () => {
    expect(toHttpError(ErrorCode.CONFIG_INVALID)).toBe(400);
  });

  it('should map db codes to 500', () => {
    expect(toHttpError(ErrorCode.DB_ERROR)).toBe(500);
  });
});
