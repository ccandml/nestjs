import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAddress } from './entities/user-address.entity';
import { Repository } from 'typeorm';
import { AddressItem } from './types/result';
import { CityCode } from './entities/city-code.entity';

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddress)
    private addressRepository: Repository<UserAddress>,
    @InjectRepository(CityCode)
    private cityCodeRepository: Repository<CityCode>,
  ) {}

  // 根据单个地区编码解析完整地区名，用于落库 fullLocation。
  private async resolveFullLocation(locationCode: string): Promise<string> {
    const row = await this.cityCodeRepository.findOne({
      where: {
        code: locationCode,
      },
    });
    if (!row) {
      throw new NotFoundException(`地区编码不存在: ${locationCode}`);
    }
    return row.fullName;
  }

  private toAddressItem(item: UserAddress): AddressItem {
    return {
      id: item.id,
      receiver: item.receiver,
      contact: item.contact,
      locationCode: item.locationCode,
      address: item.address,
      isDefault: item.isDefault,
      fullLocation: item.fullLocation,
    };
  }

  // 新增地址
  async createAddress(userId: string, dto: CreateUserAddressDto) {
    const count = await this.addressRepository.count({
      where: { userId },
    });
    let isDefault = dto.isDefault;
    // 如果是第一条地址，自动设为默认
    if (count === 0) {
      isDefault = 1;
    }
    // 如果新增地址要设为默认，先清空其他默认地址
    if (isDefault === 1) {
      await this.addressRepository.update({ userId }, { isDefault: 0 });
    }

    const fullLocation = await this.resolveFullLocation(dto.locationCode);

    const address = this.addressRepository.create({
      userId,
      receiver: dto.receiver,
      contact: dto.contact,
      locationCode: dto.locationCode,
      address: dto.address,
      isDefault,
      fullLocation,
    });
    await this.addressRepository.save(address);
    return {
      success: true,
    };
  }

  // 请求地址列表
  async getUserAddressList(userId: string): Promise<AddressItem[]> {
    const list = await this.addressRepository.find({
      where: { userId },
      order: {
        isDefault: 'DESC',
        id: 'DESC',
      },
    });
    return list.map((item) => this.toAddressItem(item));
  }
  // 更新地址
  async updateAddress(id: string, userId: string, dto: UpdateUserAddressDto) {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('地址不存在');
    }
    if (dto.isDefault === 1) {
      await this.addressRepository
        .createQueryBuilder()
        .update()
        .set({ isDefault: 0 })
        .where('user_id = :userId', { userId })
        .andWhere('id != :id', { id })
        .execute();
    }
    address.receiver = dto.receiver ?? address.receiver;
    address.contact = dto.contact ?? address.contact;
    address.locationCode = dto.locationCode ?? address.locationCode;
    address.address = dto.address ?? address.address;
    address.isDefault = dto.isDefault ?? address.isDefault;
    if (dto.locationCode) {
      address.fullLocation = await this.resolveFullLocation(dto.locationCode);
    }

    await this.addressRepository.save(address);

    return {
      success: true,
    };
  }
  // 删除地址
  async removeAddress(id: string, userId: string) {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('地址不存在');
    }
    const wasDefault = address.isDefault === 1;
    await this.addressRepository.remove(address);
    // 如果删除的是默认地址，就再查该用户剩余地址，取一条设为默认
    if (wasDefault) {
      const nextAddress = await this.addressRepository.findOne({
        where: { userId },
        order: { id: 'DESC' },
      });
      if (nextAddress) {
        nextAddress.isDefault = 1;
        await this.addressRepository.save(nextAddress);
      }
    }
    return {
      success: true,
    };
  }
  // 查出这条地址详情，并确保它属于当前用户
  async getAddressById(userId: string, id: string): Promise<AddressItem> {
    const address = await this.addressRepository.findOne({
      where: { userId, id },
    });
    if (!address) {
      throw new NotFoundException('地址不存在');
    }
    return this.toAddressItem(address);
  }
}
