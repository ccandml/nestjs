import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

// 角色数据会直接影响鉴权结果，所以这里统一要求登录且具备管理员权限。
@Controller('roles')
@Roles(RolesDecoratorEnum.Admin)
@UseGuards(JwtGuard, RolesGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}
  // 根据id查角色
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.rolesService.findOne(id);
  }
  // 更新角色
  @Put(':id')
  updateRole(@Param('id') id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }
  //   删除角色
  @Delete(':id')
  deleteRole(@Param('id') id: number) {
    return this.rolesService.deleteRole(id);
  }
}
