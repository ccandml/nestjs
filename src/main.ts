import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';
import { SerializeInterceptor } from './interceptors/serialize/serialize.interceptor';
import { TypeormFilter } from './filters/typeorm/typeorm.filter';
import { UserRateLimitGuard } from './guards/user-rate-limit.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // logger: false, //关闭整个nestjs日志打印
    // logger: ['warn', 'error'],
  });
  // 注册全局过滤器
  // 可以注册多个全局过滤器，后注册的过滤器优先捕获异常
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new TypeormFilter()); // 注册第二个过滤器，优先捕获异常

  // 全局（管道）
  app.useGlobalPipes(
    new ValidationPipe({
      // 去除类上不存在的字段
      whitelist: true,
      transform: true, // 自动转换类型
      forbidNonWhitelisted: true, // 当请求体中存在类上不存在的字段时，抛出异常
    }),
  );

  // 全局拦截器
  app.useGlobalInterceptors(new SerializeInterceptor());

  // 全局限流：同一 IP 访问同一接口频率限制。
  app.useGlobalGuards(new UserRateLimitGuard());

  // 跨域配置
  app.enableCors({
    // 直接放开所有来源，便于前后端联调。
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'source-client'],
  });

  // 全局前缀
  app.setGlobalPrefix('cyx/v1');

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
