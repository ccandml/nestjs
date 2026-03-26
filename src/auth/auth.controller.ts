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
}
