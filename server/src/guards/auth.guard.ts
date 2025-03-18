import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";

@Injectable()
export class AuthGuard implements CanActivate{

  constructor(
    private jwtService: JwtService
  ){}

  async canActivate(context: ExecutionContext): Promise<boolean>{

    const request = context.switchToHttp().getRequest()

    const token = this.getToken(request.headers)

    if(!token) throw new UnauthorizedException()

    try{
      const payLoad = await this.jwtService.verify(token)
      request.userId = payLoad.userId
      request.role = payLoad.role
    }catch(e){
      throw new UnauthorizedException()
    }

    return true
  }

  getToken(headers){
    if(!headers['authorization']) return null
    const [type, token] = headers['authorization'].split(' ')
    return type === 'Bearer' ? token : null
  }

}
