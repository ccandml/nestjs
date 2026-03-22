import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserAddressService } from './user-address.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { JwtGuard } from 'src/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('user-address')
export class UserAddressController {
  constructor(private readonly userAddressService: UserAddressService) {}
  // 新建地址
  @Post()
  createAddress(@Req() req, @Body() dto: CreateUserAddressDto) {
    const userId = req.user.userId;
    return this.userAddressService.createAddress(userId, dto);
  }
  // 获取地址列表
  @Get()
  getUserAddressList(@Req() req) {
    const userId = req.user.userId;
    return this.userAddressService.getUserAddressList(userId);
  }
  // 修改地址
  @Put('/:id')
  updateAddress(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    const userId = req.user.userId;
    return this.userAddressService.updateAddress(id, userId, dto);
  }
  // 删除地址
  @Delete('/:id')
  removeAddress(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.userAddressService.removeAddress(id, userId);
  }
}
