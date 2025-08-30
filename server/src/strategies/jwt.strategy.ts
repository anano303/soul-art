import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/services/users.service';
import { TokenPayload } from '../users/dtos/auth.dto';
import { Request } from 'express';
import { cookieConfig } from '@/cookie-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from cookies
        (request: Request) => {
          if (request?.cookies?.[cookieConfig.access.name]) {
            return request.cookies[cookieConfig.access.name];
          }
          return null;
        },
        // Fallback to Authorization header for backwards compatibility during transition
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      passReqToCallback: false,
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
