import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth2';
import { Role } from '../types/role.enum';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(req, accessToken, refreshToken, profile, done) {
    // Check if sellerMode and popup were passed via state parameter
    let sellerMode = false;
    let popup = false;
    try {
      if (req.query?.state) {
        const state = JSON.parse(req.query.state);
        sellerMode = state.sellerMode === true;
        popup = state.popup === true;
      }
    } catch (e) {
      // State parsing failed, continue with defaults
    }

    const user = {
      name: `${profile.given_name} ${profile.family_name}`,
      email: profile.email,
      googleId: profile.id,
      avatar: profile.picture,
      password: '',
      role: sellerMode ? Role.Seller : Role.User,
      sellerMode,
      popup,
    };

    done(null, user);
  }
}
