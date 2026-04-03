import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AdminQueryUserDto } from './dto/admin-query-user.dto';
import { JwtGuard } from 'src/guards/jwt.guard';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { RolesGuard } from 'src/guards/roles.guard';

@Roles(RolesDecoratorEnum.Admin)
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin-user')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  // 管理端用户列表（分页 + 关键词筛选 + 单字段排序）
  @Get('list')
  getUserList(@Query() query: AdminQueryUserDto) {
    return this.userService.queryAdminUserList(query);
  }

  // 管理端用户详情（按用户id）
  @Get('detail')
  getUserDetail(@Query('id') id: string) {
    return this.userService.queryAdminUserDetail(id);
  }

  // 管理端新增用户：由当前登录人的角色决定可创建的目标角色。
  @Post()
  createUser(@Req() req: any, @Body() dto: AdminCreateUserDto) {
    return this.userService.addUserByAdmin(req.user.userId, dto);
  }

  // 管理端删除用户（按用户id）
  @Roles(RolesDecoratorEnum.SuperAdmin) // 只有超级管理员可以删除用户
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUserById(id);
  }
}
