import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserService } from 'src/user/user.service';
import { SigninUserDTO } from './dto/signin-user.dto';
import { JwtService } from '@nestjs/jwt';
// import * as argon2 from 'argon2';

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
    // 直接密码明文比对（测试阶段）
    // const isPasswordValid = await argon2.verify(user.password, password);
    if (user.password === password) {
      // 生成token
      return {
        access_token: this.jwtService.sign({
          username: user.username,
          sub: user.id,
        }),
        id: user.id,
        username: user.username,
      };
    }
    throw new UnauthorizedException();
  }

  async signup(dto: any) {
    const { username, password } = dto;
    const user = await this.userService.addUser({ username, password });
    return user;
  }
}
