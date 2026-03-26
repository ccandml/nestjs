import { Module } from '@nestjs/common';
import { UserAddressService } from './user-address.service';
import { UserAddressController } from './user-address.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddress } from './entities/user-address.entity';
import { CityCode } from './entities/city-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress, CityCode])],
  controllers: [UserAddressController],
  providers: [UserAddressService],
  exports: [UserAddressService],
})
export class UserAddressModule {}
