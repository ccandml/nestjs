import { Global, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])], // 生成UserRepository并注册
  providers: [UserService], // 注册UserService
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
