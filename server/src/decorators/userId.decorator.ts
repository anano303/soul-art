import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.user && typeof request.user === 'object') {
      return request.user._id?.toString() ?? request.user.id ?? request.userId;
    }
    return request.userId;
  },
);
