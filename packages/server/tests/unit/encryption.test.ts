import { describe, it, expect } from 'vitest';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../../src/utils/encryption.js';

describe('Encryption', () => {
  describe('encryptApiKey / decryptApiKey', () => {
    it('should encrypt and decrypt correctly', () => {
      const original = 'sk-test-api-key-12345-abcdef';
      const encrypted = encryptApiKey(original);
      const decrypted = decryptApiKey(encrypted);
      
      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted.length).toBeGreaterThan(original.length);
    });

    it('should produce different encrypted values for same input', () => {
      const original = 'sk-test-key';
      const encrypted1 = encryptApiKey(original);
      const encrypted2 = encryptApiKey(original);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(decryptApiKey(encrypted1)).toBe(original);
      expect(decryptApiKey(encrypted2)).toBe(original);
    });

    it('should handle short keys', () => {
      const original = 'abc';
      const encrypted = encryptApiKey(original);
      const decrypted = decryptApiKey(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('should handle long keys', () => {
      const original = 'sk-' + 'a'.repeat(200);
      const encrypted = encryptApiKey(original);
      const decrypted = decryptApiKey(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('should handle unicode in keys', () => {
      const original = 'sk-中文密钥-🔑';
      const encrypted = encryptApiKey(original);
      const decrypted = decryptApiKey(encrypted);
      
      expect(decrypted).toBe(original);
    });

    it('should throw on invalid encrypted data', () => {
      expect(() => decryptApiKey('short')).toThrow();
      expect(() => decryptApiKey('')).toThrow();
    });

    it('should throw on corrupted encrypted data', () => {
      const original = 'sk-test-key';
      const encrypted = encryptApiKey(original);
      const corrupted = encrypted.slice(0, -10) + '0000000000';
      
      expect(() => decryptApiKey(corrupted)).toThrow();
    });
  });

  describe('maskApiKey', () => {
    it('should mask long keys correctly', () => {
      expect(maskApiKey('sk-abcdefgh12345678')).toBe('sk-a...5678');
    });

    it('should mask medium keys (length > 8)', () => {
      expect(maskApiKey('sk-abc12345')).toBe('sk-a...2345');
    });

    it('should return *** for short keys (length <= 8)', () => {
      expect(maskApiKey('sk-abc1')).toBe('***');
      expect(maskApiKey('abcdefg')).toBe('***');
      expect(maskApiKey('12345678')).toBe('***');
    });

    it('should handle short keys', () => {
      expect(maskApiKey('abc')).toBe('***');
      expect(maskApiKey('abcd')).toBe('***');
      expect(maskApiKey('abcdefg')).toBe('***');
    });

    it('should handle empty key', () => {
      expect(maskApiKey('')).toBe('***');
      expect(maskApiKey(null as any)).toBe('***');
      expect(maskApiKey(undefined as any)).toBe('***');
    });
  });
});