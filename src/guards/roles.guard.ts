import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { UserService } from 'src/user/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 读取装饰器上需要的权限
    // getAllAndOverride 接口 权限覆盖 控制器 权限     getAllAndMerge 两者合并
    const requiredRoles = this.reflector.getAllAndOverride<
      RolesDecoratorEnum[]
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    // 先通过jwt守卫获取用户
    const req = context.switchToHttp().getRequest();
    const user = await this.userService.findUsersWithRoles({
      id: req.user.userId,
    });

    // 如果没有装饰器（不需要权限），直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const rolesId = user?.roles?.map((i) => i.id) || [];

    // 角色权限是有层级的：超级管理员可以访问管理员接口，管理员可以访问普通用户接口。
    // 这里先把当前用户的“有效权限集合”展开，再做路由权限校验。
    const effectiveRoles = new Set<number>(rolesId);
    if (rolesId.includes(RolesDecoratorEnum.SuperAdmin)) {
      effectiveRoles.add(RolesDecoratorEnum.Admin);
      effectiveRoles.add(RolesDecoratorEnum.User);
    } else if (rolesId.includes(RolesDecoratorEnum.Admin)) {
      effectiveRoles.add(RolesDecoratorEnum.User);
    }

    // 用户必须满足所有权限才放行；不满足时抛出明确异常文案，便于前端直接展示。
    const hasAllRoles = requiredRoles.every((i) => effectiveRoles.has(i));
    if (hasAllRoles) {
      return true;
    }

    // SuperAdmin 场景给出更精确提示；其余场景保持通用“无权限”。
    if (requiredRoles.includes(RolesDecoratorEnum.SuperAdmin)) {
      throw new ForbiddenException('无权限：仅超级管理员可操作');
    }

    throw new ForbiddenException('无权限：当前账号无访问权限');
  }
}
