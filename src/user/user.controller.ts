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
import { getUsersDTO } from './types/dto';
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

  // 管理员查询用户全部信息
  @Get()
  getUsers(@Query() query: getUsersDTO): any {
    this.logger.log('请求getUsers成功！'); // 手动打印日志
    return this.userService.findUsers(query);
  }

  // 用户查询个人信息
  @Get('profile')
  @UseGuards(AdminGuard) // 验证token
  findProfile(@Query('id', ParseIntPipe) id: number, @Request() req) {
    // 拿到query对象里的id，自动转化为int，转化失败则自动抛出错误
    this.logger.log('请求findProfile成功！'); // 手动打印日志
    console.log(req.user);

    return this.userService.findProfile(id);
  }

  // 新增用户
  @Post()
  addUser(@Body() dto: any): any {
    this.logger.log(dto);
    return this.userService.addUser(dto);
  }

  // 更新用户
  @Patch('/:id')
  updateUser(@Param('id') id: number, @Body() dto: any): any {
    console.log(id, dto);

    return this.userService.updateUser(id, dto);
  }

  // 删除用户
  @Delete('/:id')
  deleteUser(@Param('id') id: number): any {
    return this.userService.deleteUser(Number(id));
  }
}
