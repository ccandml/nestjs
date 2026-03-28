import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class OrderCreateGoodsDto {
  @IsNotEmpty({ message: 'skuId 不能为空' })
  @IsString({ message: 'skuId 必须为字符串格式' })
  skuId: string;

  @Type(() => Number)
  @IsInt({ message: 'count 必须为整数' })
  @Min(1, { message: 'count 最小为 1' })
  count: number;
}

/** 提交订单 请求参数 DTO */
export class OrderCreateParams {
  @IsNotEmpty({ message: 'addressId 不能为空' })
  @IsString({ message: 'addressId 必须为字符串格式' })
  addressId: string;

  @Type(() => Number)
  @IsInt({ message: 'deliveryTimeType 必须为整数' })
  @IsIn([1, 2, 3], { message: 'deliveryTimeType 仅支持 1/2/3' })
  deliveryTimeType: 1 | 2 | 3;

  @IsOptional()
  @IsString({ message: 'buyerMessage 必须为字符串格式' })
  buyerMessage?: string;

  @IsArray({ message: 'goods 必须为数组' })
  @ArrayMinSize(1, { message: 'goods 至少包含一件商品' })
  @ValidateNested({ each: true })
  @Type(() => OrderCreateGoodsDto)
  goods: OrderCreateGoodsDto[];

  @Type(() => Number)
  @IsInt({ message: 'payType 必须为整数' })
  @IsIn([1, 2], { message: 'payType 仅支持 1/2' })
  payType: 1 | 2;

  @ValidateIf((o: OrderCreateParams) => o.payType === 1)
  @Type(() => Number)
  @IsInt({ message: 'payChannel 必须为整数' })
  @IsIn([1, 2], { message: 'payChannel 仅支持 1/2' })
  payChannel?: 1 | 2;
}

export class CreateOrderDto extends OrderCreateParams {}
