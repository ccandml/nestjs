import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';

// 使用这个过滤器要先注册 (main.ts)
@Catch(HttpException) // 标记这个过滤器只捕获 HttpException 及其子类异常
// 自定义过滤器的类名，实现了 ExceptionFilter 接口，因此必须实现 catch 方法
export class HttpExceptionFilter implements ExceptionFilter {
  // exception: HttpException：捕获到的具体异常实例，包含异常状态码、消息等信息
  // host: ArgumentsHost：异常发生的上下文对象，用于获取请求 / 响应等信息
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp(); // 切换到 HTTP 上下文，获取 HTTP 相关的请求 / 响应对象
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    console.log('response', response);
    console.log('request', request);
    console.log('status', status);

    // 设置响应状态码，并返回自定义的 JSON 格式异常信息
    response.status(status).json({
      code: status,
      timestamp: new Date().toISOString(), // 异常发生的时间戳
      message: exception.message || exception.name,
    });
  }
}
