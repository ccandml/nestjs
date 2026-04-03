import { Global, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Roles } from 'src/roles/roles.entity';
import { AdminUserController } from './admin-user.controller';
import { Order } from 'src/order/entities/order.entity';
import { UserAddress } from 'src/user-address/entities/user-address.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Roles, Order, UserAddress])], // 生成Repository并注册
  providers: [UserService], // 注册UserService
  controllers: [UserController, AdminUserController],
  exports: [UserService],
})
export class UserModule {}
