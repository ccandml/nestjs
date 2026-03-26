import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Request,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { TypeormFilter } from 'src/filters/typeorm/typeorm.filter';
import { JwtGuard } from 'src/guards/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';

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

  // 获取用户信息 - 需要token验证
  @UseGuards(JwtGuard) // 验证请求的token有效性
  @Get('profile')
  getUsers(@Request() req: any): any {
    // 从JWT token中解析出来的用户信息已挂到req.user
    const userId = req.user.userId;
    this.logger.log(`Fetching user profile for userId: ${userId}`);
    return this.userService.getUserById(userId);
  }

  // 修改用户信息 - 需要token验证
  @UseGuards(JwtGuard)
  @Put('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateUserDto): any {
    const userId = req.user.userId;
    return this.userService.updateUserById(userId, dto);
  }

  // 新增用户
  @Post()
  addUser(@Body() dto: any): any {
    this.logger.log(dto);
    return this.userService.addUser(dto);
  }
}
