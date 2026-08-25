import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Field-level encryption for PII (national ID, and future account numbers).
 * AES-256-GCM ciphertext for storage/display; a separate deterministic
 * HMAC-SHA256 hash is stored alongside for uniqueness constraints and exact
 * lookups, since GCM ciphertext is non-deterministic (random IV per call)
 * and can't be used for equality queries.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly hmacKey: string;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('FIELD_ENCRYPTION_KEY');
    this.key = scryptSync(secret, 'golden-knot-field-encryption', 32);
    this.hmacKey = secret;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  hash(plaintext: string): string {
    return createHmac('sha256', this.hmacKey)
      .update(plaintext.trim().toUpperCase())
      .digest('hex');
  }
}
