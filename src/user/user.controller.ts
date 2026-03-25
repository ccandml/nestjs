import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { TypeormFilter } from 'src/filters/typeorm/typeorm.filter';
import { AdminGuard } from 'src/guards/admin/admin.guard';
import { JwtGuard } from 'src/guards/jwt.guard';

@UseFilters(TypeormFilter) // 在控制器上使用过滤器，捕获该控制器内的异常
// @UseGuards(JwtGuard) // 每个请求都必须验证token
@Controller('user')
export class UserController {
  // 手动打印日志
  private logger = new Logger(UserController.name); // 定义该模块的名字（显示哪个模块的打印）

  constructor(
    private userService: UserService,
    private configService: ConfigService,
  ) {
    this.logger.log('UserController init');
  }

  // 新增用户
  @Post()
  addUser(@Body() dto: any): any {
    this.logger.log(dto);
    return this.userService.addUser(dto);
  }
}
