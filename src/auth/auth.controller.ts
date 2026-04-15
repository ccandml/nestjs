import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninUserDTO } from './dto/signin-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  signin(@Body() dto: SigninUserDTO) {
    return this.authService.signin(dto);
  }

  @Post('signup')
  signup(@Body() dto: SigninUserDTO) {
    return this.authService.signup(dto);
  }

  // 管理端登录：只允许超级管理员（id=1）和管理员（id=2）登录。
  @Post('admin-signin')
  adminSignin(@Body() dto: SigninUserDTO) {
    return this.authService.adminSignin(dto);
  }

  // 微信小程序登录：前端传 code，后端调用微信官方接口获得 openid，
  // 然后根据 openid 登录用户（不存在则自动注册）
  @Post('wechat-signin')
  wechatSignin(@Body() body: { code: string }) {
    return this.authService.wechatSignin(body.code);
  }
}
