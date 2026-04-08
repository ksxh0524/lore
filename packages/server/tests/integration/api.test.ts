import { describe, it, expect } from 'vitest';
import { ErrorCode, LoreError, toHttpError } from '../../src/errors.js';

describe('Errors', () => {
  it('should create LoreError with code and message', () => {
    const err = new LoreError(ErrorCode.WORLD_NOT_FOUND, 'World not found', 404);
    expect(err.code).toBe(1001);
    expect(err.message).toBe('World not found');
    expect(err.statusCode).toBe(404);
  });

  it('should map error codes to http status', () => {
    expect(toHttpError(ErrorCode.WORLD_NOT_FOUND)).toBe(404);
    expect(toHttpError(ErrorCode.AGENT_NOT_FOUND)).toBe(404);
    expect(toHttpError(ErrorCode.LLM_API_ERROR)).toBe(502);
    expect(toHttpError(ErrorCode.VALIDATION_ERROR)).toBe(400);
    expect(toHttpError(ErrorCode.DB_ERROR)).toBe(500);
  });
});
