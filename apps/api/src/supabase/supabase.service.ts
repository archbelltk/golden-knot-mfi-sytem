import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

const KYC_BUCKET = 'kyc-documents';

@Injectable()
export class SupabaseService {
  private client: ReturnType<typeof createClient>;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
  }

  async uploadKycDocument(
    clientId: string,
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ) {
    const storageKey = `${clientId}/${Date.now()}-${fileName}`;
    const { error } = await this.client.storage
      .from(KYC_BUCKET)
      .upload(storageKey, buffer, { contentType, upsert: false });
    if (error) throw error;
    return storageKey;
  }

  async getKycDocumentSignedUrl(storageKey: string, expiresInSeconds = 300) {
    const { data, error } = await this.client.storage
      .from(KYC_BUCKET)
      .createSignedUrl(storageKey, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}
