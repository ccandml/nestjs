import { Logs } from 'src/logs/logs.entity';
import { Roles } from 'src/roles/roles.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { Profile } from './profile.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
  })
  profile: Profile;

  @OneToMany(() => Logs, (logs) => logs.user, {
    cascade: true,
  })
  logs: Logs[];

  @ManyToMany(() => Roles, (roles) => roles.users, {
    cascade: true, // 级联保存
    onDelete: 'CASCADE', // 级联删除 如果关联的表被删了，同时也删除我
  })
  @JoinTable({ name: 'user_roles' })
  roles: Roles[];
}
