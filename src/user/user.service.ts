import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Roles } from 'src/roles/roles.entity';
import * as argon2 from 'argon2';
import { ProfileDetail } from './types/result';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 获取用户信息
  async findUsers(dto: any): Promise<ProfileDetail[]> {
    const { id, username, password, page = 1, pageSize = 10 } = dto;
    const where: Record<string, unknown> = {};

    if (id !== undefined && id !== null) {
      where.id = id;
    }
    if (username) {
      where.username = username;
    }
    if (password) {
      where.password = password;
    }

    const users = await this.userRepository.find({
      select: {
        id: true,
        username: true,
        password: true,
        gender: true,
        birthday: true,
        avatar: true,
        fullLocation: true,
        profession: true,
      },
      where,
      order: {
        id: 'ASC',
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return users.map((item) => ({
      id: item.id,
      username: item.username,
      password: item.password,
      gender: item.gender,
      birthday: item.birthday,
      avatar: item.avatar,
      fullLocation: item.fullLocation,
      profession: item.profession,
    }));
  }

  // 权限守卫使用：查询用户并携带角色
  async findUsersWithRoles(dto: { id?: number | string; username?: string }) {
    const where: Record<string, unknown> = {};

    if (dto.id !== undefined && dto.id !== null) {
      where.id = dto.id;
    }
    if (dto.username) {
      where.username = dto.username;
    }

    return this.userRepository.find({
      select: {
        id: true,
        username: true,
        roles: {
          id: true,
        },
      },
      where,
      relations: ['roles'],
      order: {
        id: 'ASC',
      },
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
}
