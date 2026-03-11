import {
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';

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

  @Get()
  getUsers(): any {
    // 过滤器
    const isAdmin = false;
    if (!isAdmin) {
      throw new NotFoundException('该用户不存在');
      // throw new HttpException(
      //   '该用户不是admin，无法查询',
      //   HttpStatus.FORBIDDEN,
      // );
    }

    this.logger.log('请求getUsers成功！'); // 手动打印日志

    return this.userService.findAll();
  }

  @Get('user')
  getUer(): any {
    return this.userService.findOne(2);
  }

  // 新增用户
  @Post()
  addUser(): any {
    const user = { username: 'wang_wu', password: '123456abc' } as User;
    return this.userService.create(user);
  }

  // 更新用户
  @Post('update')
  updateUser(): any {
    return this.userService.update(3, { username: 'li_sisi001' });
  }

  @Delete('update')
  remove(): any {
    return this.userService.remove(1);
  }

  @Get('profile')
  getProfile(): any {
    return this.userService.findProfile(2);
  }
}
