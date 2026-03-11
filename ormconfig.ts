import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logs } from 'src/logs/logs.entity';
import { Roles } from 'src/roles/roles.entity';
import { Profile } from 'src/user/profile.entity';
import { User } from 'src/user/user.entity';

export default {
  // 管家configService 靠get()拿到配置
  type: 'mysql',
  host: '127.0.0.1',
  port: 3307,
  username: 'root',
  password: 'example',
  database: 'testdb',
  entities: [User, Profile, Logs, Roles],
  synchronize: true,
  logging: false,
} as TypeOrmModuleOptions;
