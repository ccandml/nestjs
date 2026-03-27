import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { Roles } from 'src/roles/roles.entity';
import { ProfileDetail } from './types/result';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Roles)
    private rolesRepository: Repository<Roles>,
  ) {}

  // 根据用户ID获取用户信息（从token中获取userId调用）
  async getUserById(userId: number): Promise<ProfileDetail> {
    const user = await this.userRepository.findOne({
      select: {
        id: true,
        username: true,
        gender: true,
        birthday: true,
        avatar: true,
        fullLocation: true,
        profession: true,
      },
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      gender: user.gender,
      birthday: user.birthday,
      avatar: user.avatar,
      fullLocation: user.fullLocation,
      profession: user.profession,
    };
  }

  // JWT,权限守卫使用：查询用户并携带角色
  async findUsersWithRoles(dto: { id?: number | string; username?: string }) {
    const where: Record<string, unknown> = {};

    if (dto.id !== undefined && dto.id !== null) {
      where.id = dto.id;
    }
    if (dto.username) {
      where.username = dto.username;
    }

    return this.userRepository.findOne({
      select: {
        id: true,
        username: true,
        password: true,
        roles: {
          id: true,
        },
        avatar: true,
      },
      where,
      relations: ['roles'],
    });
  }

  // 新增用户
  async addUser(user: Partial<User>) {
    const userTemp = this.userRepository.create(user); // 创建对象，并且自动补充没有的字段

    // 只关联已存在角色，不在创建用户时新建角色
    const roleIdsFromPayload = Array.isArray(user.roles)
      ? user.roles
          .map((role) =>
            typeof role === 'number' ? role : (role as Roles | undefined)?.id,
          )
          .filter((id): id is number => Number.isInteger(id) && id > 0)
      : [];

    // 未传角色时默认关联“普通用户”角色（id=3）
    const roleIds =
      roleIdsFromPayload.length > 0
        ? Array.from(new Set(roleIdsFromPayload))
        : [3];

    const roles = await this.rolesRepository.find({
      where: { id: In(roleIds) },
    });

    // 强校验：所有角色都必须存在，避免出现无效关联
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('角色不存在');
    }

    userTemp.roles = roles;

    // 对密码进行加密存储！！！
    // userTemp.password = await argon2.hash(user.password);
    const saveUser = await this.userRepository.save(userTemp); // 操作数据库，插入or更新 数据
    return saveUser;
  }

  // 修改用户信息：前端传入的新字段覆盖数据库中的旧字段
  async updateUserById(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<ProfileDetail> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updatableKeys: Array<keyof UpdateUserDto> = [
      'username',
      'gender',
      'birthday',
      'avatar',
      'fullLocation',
      'profession',
    ];

    for (const key of updatableKeys) {
      if (dto[key] !== undefined) {
        (user as any)[key] = dto[key];
      }
    }

    await this.userRepository.save(user);
    return this.getUserById(userId);
  }
}
