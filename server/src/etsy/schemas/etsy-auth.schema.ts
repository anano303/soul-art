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

  // Master feature flag: controls the entire Etsy feature for sellers
  // (publish buttons, promotions, price previews)
  @Prop({ default: false })
  integrationEnabled?: boolean;

  // Admins can use the feature even while the master flag is off (testing)
  @Prop({ default: true })
  enabledForAdmins?: boolean;

  // Outage kill switch: the feature stays launched (banners, guide, buttons
  // all remain visible) but sellers cannot publish and are told to try later.
  // Admins keep access via enabledForAdmins so they can verify the fix.
  @Prop({ default: false })
  temporarilyDisabled?: boolean;

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
