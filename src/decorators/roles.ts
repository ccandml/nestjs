import { SetMetadata } from '@nestjs/common';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolesDecoratorEnum[]) =>
  SetMetadata(ROLES_KEY, roles);
