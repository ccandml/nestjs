import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  findAll() {
    // return this.userRepository.find();
    const queryBuilder = this.userRepository.createQueryBuilder('u');
    return queryBuilder.getMany();
  }

  findOne(id: number) {
    // return this.userRepository.findOne({ where: { id } });
    return this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .getOne();
  }

  // 新增用户
  async create(user: User) {
    // const userTemp = this.userRepository.create(user); // 创建对象，并且自动补充没有的字段
    // const saveUser = await this.userRepository.save(userTemp); // 操作数据库，插入or更新 数据
    // return saveUser;

    const userTemp = this.userRepository.create(user); // 创建对象，并且自动补充没有的字段
    return this.userRepository
      .createQueryBuilder('u')
      .insert()
      .into(User)
      .values(userTemp)
      .execute();
  }

  // 更新用户
  async update(id: number, user: Partial<User>) {
    // return this.userRepository.update(id, user);
    const updateData = await this.userRepository
      .createQueryBuilder()
      .update()
      .set(user)
      .where('user.id = :id', { id }) // update和delete不能使用别名u
      .execute();
    return updateData;
  }

  remove(id: number) {
    // return this.userRepository.delete(id);
    return this.userRepository
      .createQueryBuilder()
      .delete()
      .where('user.id = :id', { id })
      .execute();
  }

  findProfile(id: number) {
    // return this.userRepository.findOne({
    //   where: { id },
    //   relations: {
    //     profile: true,
    //   },
    // });
    return this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .leftJoinAndSelect('u.profile', 'p')
      .getOne();
  }
}
