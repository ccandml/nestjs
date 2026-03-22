import { IsNotEmpty, IsString, Matches, Min } from 'class-validator';

export class CreateOrderDto {}

// 立即购买 DTO
export class BuyNowDto {
  @IsNotEmpty({ message: 'skuId 不能为空' })
  @IsString({ message: 'skuId 必须为字符串格式' })
  skuId: string;

  @IsNotEmpty({ message: '购买数量不能为空' })
  @IsString({ message: 'count 必须为字符串格式' })
  @Matches(/^[1-9]\d*$/, { message: '购买数量必须为正整数' })
  count: string;

  @IsNotEmpty({ message: '收货地址ID不能为空' })
  @IsString({ message: 'addressId 必须为字符串格式' })
  addressId: string;
}

// 购物车购买 DTO
export class CreateOrderFromCartDto {
  @IsNotEmpty({ message: '收货地址ID不能为空' })
  @IsString({ message: 'addressId 必须为字符串格式' })
  addressId: string;
}
