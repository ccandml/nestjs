import { Roles } from 'src/roles/roles.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';

export const GENDER_VALUES = ['女', '男', '未知'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: GENDER_VALUES,
    nullable: true,
    comment: '性别',
  })
  gender?: Gender;

  @Column({
    type: 'date',
    nullable: true,
    comment: '生日',
  })
  birthday?: string;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: '头像',
  })
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '省市区',
  })
  fullLocation?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '职业',
  })
  profession?: string;

  @ManyToMany(() => Roles, (roles) => roles.users, {
    // 仅维护关联关系，不级联新增/修改角色实体，避免创建新角色
    cascade: false,
    onDelete: 'CASCADE', // 当 user 或 role 被删除时，自动删除 user_roles 中的关联记录
  })
  @JoinTable({ name: 'user_roles' })
  roles: Roles[];
}
