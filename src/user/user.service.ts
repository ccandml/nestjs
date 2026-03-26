import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Roles } from 'src/roles/roles.entity';
import * as argon2 from 'argon2';
import { ProfileDetail } from './types/result';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
      },
      where,
      relations: ['roles'],
    });
  }

  // 新增用户
  async addUser(user: Partial<User>) {
    const userTemp = this.userRepository.create(user); // 创建对象，并且自动补充没有的字段
    // 自动添加为 "普通用户"
    if (!user.roles || user.roles.length === 0) {
      userTemp.roles = [{ id: 3 } as Roles]; // orm会自动关联user里面的roles表的id,但是ts会报错，必须断言
    } else {
      // 根据前端传的[id,id]来对应roles名
      userTemp.roles = user.roles.map((id) => ({ id }) as unknown as Roles);
    }
    // 对密码进行加密存储！！！
    userTemp.password = await argon2.hash(user.password);
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
