import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
    const userList = await this.userService.findUsers({ id: req.user.userId });
    const user = userList[0];

    // 如果没有装饰器（不需要权限），直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const rolesId = user.roles.map((i) => i.id);
    console.log(requiredRoles, rolesId);

    // 用户必须满足所有权限，就放行
    return requiredRoles.every((i) => rolesId.includes(i));
  }
}
