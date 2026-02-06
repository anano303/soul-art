import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Role } from '../types/role.enum';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('FACEBOOK_APP_ID'),
      clientSecret: configService.get('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get('FACEBOOK_CALLBACK_URL'),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    // Check if sellerMode was passed via state parameter
    let sellerMode = false;
    try {
      if (req.query?.state) {
        const state = JSON.parse(req.query.state);
        sellerMode = state.sellerMode === true;
      }
    } catch (e) {
      // State parsing failed, continue without sellerMode
    }

    const email = profile.emails?.[0]?.value || '';
    const name =
      profile.displayName ||
      `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
      'Facebook User';
    const avatar = profile.photos?.[0]?.value || '';

    const user = {
      name,
      email,
      facebookId: profile.id,
      avatar,
      password: '',
      role: sellerMode ? Role.Seller : Role.User,
      sellerMode,
    };

    done(null, user);
  }
}
