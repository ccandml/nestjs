import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Roles } from './roles.entity';
import { Repository } from 'typeorm';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Roles)
    private rolesRepository: Repository<Roles>,
  ) {}
  //   根据id查角色
  findOne(id: number) {
    return this.rolesRepository.findOne({ where: { id } });
  }
  // 更新角色
  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    return this.rolesRepository.merge(role, dto);
  }
  // 删除角色
  delteRole(id: number) {
    return this.rolesRepository.delete(id);
  }
}
