import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type RateLimitBucket = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  // 默认 60 秒内同一 IP 同一接口最多 60 次，可通过环境变量覆盖。
  private windowMs: number;
  private maxRequests: number;
  private readonly buckets = new Map<string, RateLimitBucket>();

  canActivate(context: ExecutionContext): boolean {
    /**
     * 1. 类属性初始化太早，.env 还没加载，导致无法正确读取环境变量。
     * 2. 将配置读取放在 canActivate 内部，能确保配置正确加载。
     **/
    if (!this.windowMs) {
      // 仅第一次请求时 读取并赋值一次，后续请求直接使用已赋值的属性，避免每次请求都读取环境变量。
      this.windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
      this.maxRequests = Number(process.env.RATE_LIMIT_MAX) || 60;
    }
    const request = context.switchToHttp().getRequest();
    const ip =
      request.ip ??
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
      request.socket?.remoteAddress ??
      'unknown-ip';

    // 使用「方法 + 路由模板 + IP」作为限流键，确保是“同一 IP 同一接口”限流。
    const routeKey = request.route?.path ?? request.path ?? request.url;
    const key = `${request.method}:${routeKey}:${String(ip)}`;

    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || now >= current.expiresAt) {
      this.buckets.set(key, {
        count: 1,
        expiresAt: now + this.windowMs,
      });
      return true;
    }

    if (current.count >= this.maxRequests) {
      throw new HttpException(
        `请求过于频繁，请稍后再试（${Math.ceil(this.windowMs / 1000)}秒内最多${this.maxRequests}次）`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }
}
