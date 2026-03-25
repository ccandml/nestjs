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
    length: 255,
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
    cascade: true, // 级联保存
    onDelete: 'CASCADE', // 级联删除 如果关联的表被删了，同时也删除我
  })
  @JoinTable({ name: 'user_roles' })
  roles: Roles[];
}
