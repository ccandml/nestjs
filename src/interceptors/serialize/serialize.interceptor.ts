import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('响应前拦截器');

    return next.handle().pipe(
      map((result) => {
        console.log('响应后拦截器，给前端之前');

        return {
          code: 200,
          result,
          message: '请求成功！',
        };
      }),
    );
  }
}
