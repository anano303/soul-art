import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";
import { cookieConfig } from '@/cookie-config';

@Injectable()
export class AuthGuard implements CanActivate{

  constructor(
    private jwtService: JwtService
  ){}

  async canActivate(context: ExecutionContext): Promise<boolean>{

    const request = context.switchToHttp().getRequest()

    const token = this.getToken(request)

    if(!token) throw new UnauthorizedException()

    try{
      const payLoad = await this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })
      request.userId = payLoad.userId || payLoad.sub
      request.role = payLoad.role
    }catch(e){
      throw new UnauthorizedException()
    }

    return true
  }

  getToken(request){
    // First try to get token from HTTP-only cookies
    if (request.cookies?.[cookieConfig.access.name]) {
      return request.cookies[cookieConfig.access.name];
    }
    
    // Fallback to Authorization header for backwards compatibility
    const headers = request.headers;
    if(!headers['authorization']) return null
    const [type, token] = headers['authorization'].split(' ')
    return type === 'Bearer' ? token : null
  }

}
