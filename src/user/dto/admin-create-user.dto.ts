import { IsIn, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';

export class AdminCreateUserDto extends CreateUserDto {
  // 管理端创建账号时，允许指定目标角色；不传时默认创建普通用户。
  @IsOptional()
  @IsIn([RolesDecoratorEnum.Admin, RolesDecoratorEnum.User], {
    message: '只能创建管理员或普通用户',
  })
  roleId?: RolesDecoratorEnum.Admin | RolesDecoratorEnum.User;
}
