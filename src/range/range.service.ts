import { Injectable } from '@nestjs/common';

@Injectable()
export class RangeService {
  getRange(num: number) {
    const data: string[] = [];
    for (let i = 1; i <= num; i++) {
      data.push(i.toString());
    }
    return {
      code: 0,
      msg: '请求成功！',
      data,
    };
  }
}
