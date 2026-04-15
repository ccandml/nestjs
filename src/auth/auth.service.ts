import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { SigninUserDTO } from './dto/signin-user.dto';
import { JwtService } from '@nestjs/jwt';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { WechatService } from './wechat.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private wechatService: WechatService,
  ) {}

  async signin(dto: SigninUserDTO) {
    const { username, password } = dto;
    const user = await this.userService.findUsersWithRoles({ username });
    if (!user) {
      throw new ForbiddenException('用户不存在');
    }

    // openid 存在说明该账号是微信小程序用户，只允许走微信登录，不允许使用账号密码登录。
    if (user.openid) {
      throw new ForbiddenException('当前账号为微信用户，请使用微信登录');
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

    // 微信用户禁止走账号密码登录，避免小程序账号和 H5 账号混用。
    if (user.openid) {
      throw new ForbiddenException('当前账号为微信用户，请使用微信登录');
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

  /**
   * 微信小程序登录
   * 前端传 code，后端调用微信 code2Session 获得 openid
   * - 如果用户已存在（根据 openid），则直接登录
   * - 如果用户不存在，则创建新用户并登录
   *
   * @param code 微信小程序前端授权登录返回的 code
   * @returns 包含 access_token、用户信息和角色名的登录响应
   */
  async wechatSignin(code: string) {
    if (!code || typeof code !== 'string' || code.trim() === '') {
      throw new BadRequestException('code 参数不能为空');
    }

    // 调用微信 code2Session 接口获得 openid
    const wechatData = await this.wechatService.code2Session(code.trim());

    // 根据 openid 查询用户是否已存在
    let user = await this.userService.findUserByOpenid(wechatData.openid);

    // 用户不存在，则自动注册
    if (!user) {
      // 微信用户的密码固定为占位值，账号密码登录入口会根据 openid 直接拦截。
      const fixedPassword = 'wx_login_user';

      // 先创建一条临时账号记录，拿到数据库自增 id 后再把用户名改成基于 id 的唯一值。
      const createdUser = await this.userService.addUser({
        username: `微信用户_${wechatData.openid.substring(0, 12)}_${Math.random().toString(36).substring(2, 8)}`,
        password: fixedPassword,
        openid: wechatData.openid,
      });

      await this.userService.updateUserById(createdUser.id, {
        username: `微信用户_${createdUser.id}`,
      });

      // 重新查询用户及其角色（因为 addUser 返回的可能不含角色信息）
      user = await this.userService.findUserByOpenid(wechatData.openid);
    }

    if (!user) {
      throw new ForbiddenException('登录失败，请重试');
    }

    // 生成 JWT token
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
}
