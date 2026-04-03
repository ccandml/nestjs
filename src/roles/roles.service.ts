import { Injectable, NotFoundException } from '@nestjs/common';
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
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    const mergedRole = this.rolesRepository.merge(role, dto);
    return this.rolesRepository.save(mergedRole);
  }
  // 删除角色
  async deleteRole(id: number) {
    const result = await this.rolesRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException('角色不存在');
    }

    return result;
  }
}
