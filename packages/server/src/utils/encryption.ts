import crypto from 'crypto';
import { LoreError, ErrorCode } from '../errors.js';

// AES-256-GCM encryption key - MUST be set via environment variable for production
// SECURITY WARNING: Using default key is insecure and should only be used for testing
const DEFAULT_KEY = 'lore-development-key-DO-NOT-USE-IN-PRODUCTION';
const ENCRYPTION_KEY = process.env.LORE_ENCRYPTION_KEY || DEFAULT_KEY;

// Warn if using default key
if (!process.env.LORE_ENCRYPTION_KEY && process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  SECURITY WARNING: Using default encryption key. API Keys will NOT be securely encrypted!');
  console.warn('⚠️  Please set LORE_ENCRYPTION_KEY environment variable for production use.');
  console.warn('⚠️  Example: LORE_ENCRYPTION_KEY="your-secure-32-character-key-here!"');
}

// Ensure key is exactly 32 bytes for AES-256
const getKey = (): Buffer => {
  const key = Buffer.from(ENCRYPTION_KEY);
  if (key.length === 32) return key;
  // Hash to 32 bytes if not exact length
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt an API key using AES-256-GCM
 * Returns base64-encoded string with format: iv:authTag:ciphertext
 */
export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted data and encode as base64
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt an encrypted API key
 * Expects base64-encoded string with format: iv:authTag:ciphertext
 */
export function decryptApiKey(encrypted: string): string {
  const combined = Buffer.from(encrypted, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new LoreError(ErrorCode.INTERNAL_ERROR, 'Invalid encrypted data: insufficient length');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Mask an API key for display (e.g., sk-abc...xyz)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 8) return '***';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}
