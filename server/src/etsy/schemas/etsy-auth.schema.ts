import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EtsyAuthDocument = EtsyAuth & Document;

// Single platform-level Etsy connection (SoulArt's own Etsy shop).
// Tokens live in DB (not .env) because Etsy rotates the refresh token
// on every refresh, and the server runs on serverless (no stable memory/disk).
export const ETSY_AUTH_KEY = 'platform';

@Schema({ timestamps: true })
export class EtsyAuth {
  @Prop({ required: true, unique: true, default: ETSY_AUTH_KEY })
  key: string;

  // OAuth tokens (Etsy access tokens live 1h, refresh tokens 90 days, rotating)
  @Prop()
  accessToken?: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  tokenExpiresAt?: Date;

  // Connected Etsy account/shop info (fetched after OAuth)
  @Prop()
  etsyUserId?: string;

  @Prop()
  shopId?: string;

  @Prop()
  shopName?: string;

  @Prop({ type: [String], default: [] })
  scopes?: string[];

  // ============================================
  // Marketplace settings (admin-configurable)
  // ============================================

  // What the seller pays us per Etsy listing (covers Etsy's $0.20 fee + margin)
  @Prop({ default: 2 })
  listingFeeGel?: number;

  // Commission % added ON TOP of the seller's price when listing on Etsy
  // (covers Etsy transaction/processing/conversion fees — never deducted
  // from the price the seller chose)
  @Prop({ default: 20 })
  commissionPercent?: number;

  // Master switch for showing the "post to Etsy" option to sellers
  @Prop({ default: false })
  integrationEnabled?: boolean;

  // Pending OAuth handshake (PKCE) — persisted so the callback works even
  // when it lands on a different serverless instance than the auth request
  @Prop()
  pendingState?: string;

  @Prop()
  pendingCodeVerifier?: string;

  @Prop()
  pendingExpiresAt?: Date;
}

export const EtsyAuthSchema = SchemaFactory.createForClass(EtsyAuth);
