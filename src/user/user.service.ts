import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { getUsersDTO } from './types/dto';
import { Roles } from 'src/roles/roles.entity';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 获取用户信息
  findUsers(dto: getUsersDTO) {
    const { id, username, password, page = 1, pageSize = 10 } = dto;
    return this.userRepository.find({
      select: {
        id: true,
        username: true,
        password: true,
        profile: true,
        logs: true,
        roles: true,
      },
      where: {
        id,
        username,
        password,
      },
      relations: ['profile', 'logs', 'roles'],
      order: {
        id: 'ASC',
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
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

  // 更新用户
  async updateUser(id: number, user: Partial<User>) {
    const userTemp = (await this.findUsers({ id }))[0]; // 查找原有数据
    // 根据前端传的[id,id]来对应roles名
    user.roles = user.roles.map((id) => {
      return {
        id,
      } as unknown as Roles;
    });
    userTemp.roles = user.roles; // 最好导入service方法，In()来找出实体类来覆盖
    /* 关系型的数据（多对多、一对多），后者覆盖前者是不可行的
      typeorm只会把后者数据添加到前者，不会删除前者的其他数据（
    */
    const newUser = this.userRepository.merge(userTemp, user);
    console.log(newUser);
    return this.userRepository.save(newUser);
  }

  // 删除用户
  async deleteUser(id: number) {
    // return this.userRepository.delete(id);
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    await this.userRepository.remove(user);
    return user;
  }

  findProfile(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: {
        profile: true,
      },
    });
  }
}
