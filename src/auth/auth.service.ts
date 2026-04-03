import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { SigninUserDTO } from './dto/signin-user.dto';
import { JwtService } from '@nestjs/jwt';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signin(dto: SigninUserDTO) {
    const { username, password } = dto;
    const user = await this.userService.findUsersWithRoles({ username });
    if (!user) {
      throw new ForbiddenException('用户不存在');
    }
    // 使用 argon2 校验数据库中的密码哈希，避免明文密码比对。
    const isPasswordValid = await argon2.verify(user.password, password);
    // 生成token
    if (isPasswordValid) {
      // 登录时把角色名一并返回，前端可以直接据此控制菜单和权限展示。
      const roleNames = (user.roles || [])
        .map((role) => role.name)
        .filter((roleName): roleName is string => Boolean(roleName));

      return {
        access_token: this.jwtService.sign({
          username: user.username,
          sub: user.id,
        }),
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        roleNames,
      };
    }
    throw new UnauthorizedException({ message: '账号或密码错误！' });
  }

  async signup(dto: any) {
    const { username, password } = dto;
    const user = await this.userService.addUser({ username, password });
    return user;
  }

  // 管理端登录：只允许角色 id 为 1（超级管理员）或 2（管理员）的用户登录。
  async adminSignin(dto: SigninUserDTO) {
    const { username, password } = dto;
    const user = await this.userService.findUsersWithRoles({ username });
    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // 检查用户是否拥有管理员角色（id = 1 或 2）
    const hasAdminRole = (user.roles || []).some(
      (role) =>
        role.id === RolesDecoratorEnum.SuperAdmin ||
        role.id === RolesDecoratorEnum.Admin,
    );

    if (!hasAdminRole) {
      throw new ForbiddenException('当前用户无权限访问管理端');
    }

    // 密码验证
    const isPasswordValid = await argon2.verify(user.password, password);
    if (isPasswordValid) {
      // 获取用户角色名，用于前端显示
      const roleNames = (user.roles || [])
        .map((role) => role.name)
        .filter((roleName): roleName is string => Boolean(roleName));

      return {
        access_token: this.jwtService.sign({
          username: user.username,
          sub: user.id,
        }),
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        roleNames,
      };
    }
    throw new UnauthorizedException({ message: '账号或密码错误！' });
  }
}
