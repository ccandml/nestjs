import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { getUsersDTO } from './types/dto';
import { TypeormFilter } from 'src/filters/typeorm/typeorm.filter';

@UseFilters(TypeormFilter) // 在控制器上使用过滤器，捕获该控制器内的异常
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

  // 获取用户信息
  @Get()
  getUsers(@Query() query: getUsersDTO): any {
    this.logger.log('请求getUsers成功！'); // 手动打印日志
    return this.userService.findUsers(query);
  }
  // 获取用户信息
  @Get('/profile')
  getProfile(@Query('id') id: number): any {
    console.log(id);
    return this.userService.findProfile(id);
  }
  // 新增用户
  @Post()
  addUser(@Body() dto: any): any {
    this.logger.log(dto);
    return this.userService.create(dto);
  }

  // 更新用户
  @Patch('/:id')
  updateUser(@Param('id') id: number, @Body() dto: any): any {
    console.log(id, dto);

    return this.userService.update(id, dto);
  }

  @Delete('/:id')
  remove(@Param('id') id: number): any {
    return this.userService.remove(id);
  }
}
