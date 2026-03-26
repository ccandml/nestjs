import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError, TypeORMError } from 'typeorm';

@Catch(TypeORMError) // 标记这个过滤器只捕获 TypeORMError 及其子类异常
export class TypeormFilter implements ExceptionFilter {
  // 将错误消息统一转换为字符串，处理数组、对象等多种格式
  private formatMessage(msg: any): string {
    if (Array.isArray(msg)) {
      return msg.join('; ');
    }
    if (typeof msg === 'object' && msg !== null) {
      return JSON.stringify(msg);
    }
    return String(msg || '');
  }

  catch(exception: TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    let code = 500;
    // 判断异常是否是 sql 错误，如果是，则获取数据库错误码
    if (exception instanceof QueryFailedError) {
      code = exception.driverError.code || 500;
    }
    response.status(500).json({
      statusCode: code,
      timestamp: new Date().toISOString(),
      message: this.formatMessage(exception.message),
    });
  }
}
