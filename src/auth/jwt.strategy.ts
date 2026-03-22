import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(protected configService: ConfigService) {
    super({
      // 1. 从请求头 Authorization: Bearer token 提取 token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 2. false = token 过期会直接拒绝
      ignoreExpiration: false,

      // 3. 验证签名用的密钥
      secretOrKey: configService.get(ConfigEnum.SECRET_TOKEN),
    });
  }
  // 4. 验证成功后执行，返回值会挂到 req.user
  // 在使用了该校验的controller上，可以通过 @Request() req 来访问req.user
  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username };
  }
}
