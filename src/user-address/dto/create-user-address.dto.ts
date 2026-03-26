import {
  IsNotEmpty,
  IsString,
  Length,
  Min,
  Max,
  IsInt,
  Matches,
} from 'class-validator';

export class CreateUserAddressDto {
  // 收货人：不能为空，字符串，长度 2-20
  @IsNotEmpty({ message: '收货人不能为空' })
  @IsString({ message: '收货人必须是字符串' })
  @Length(2, 20, { message: '收货人长度在2-20之间' })
  receiver: string;

  // 联系方式：手机号/固定电话，不能为空
  @IsNotEmpty({ message: '联系方式不能为空' })
  @IsString({ message: '联系方式必须是字符串' })
  // 支持手机号或固定电话（二选一）
  @Matches(/(^1[3-9]\d{9}$)|(^((0\d{2,3}-?)?\d{7,8})$)/, {
    message: '联系方式格式错误，需为手机号或固定电话',
  })
  contact: string;

  // 地区编码（支持6位或9位）
  @IsNotEmpty({ message: '地区编码不能为空' })
  @IsString({ message: '地区编码必须是字符串' })
  @Matches(/^\d{6}(\d{3})?$/, { message: '地区编码必须是6位或9位数字' })
  locationCode: string;

  // 详细地址
  @IsNotEmpty({ message: '详细地址不能为空' })
  @IsString()
  @Length(3, 100, { message: '详细地址长度在3-100之间' })
  address: string;

  // 是否默认地址：0=否 1=是
  @IsInt({ message: '是否默认只能是数字 0 或 1' })
  @Min(0)
  @Max(1)
  isDefault: number;
}
