import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_USER_TYPE_KEY } from '../decorators/require-user-type.decorator';

@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<('seller' | 'buyer' | 'collaborator')[]>(
      REQUIRE_USER_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTypes || requiredTypes.length === 0) {
      return true;
    }

    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const userId = req.user?.claims?.sub;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { user_type: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!requiredTypes.includes(user.user_type as any)) {
      throw new ForbiddenException(
        `Forbidden - ${requiredTypes.join(' or ')} access required`,
      );
    }

    return true;
  }
}
