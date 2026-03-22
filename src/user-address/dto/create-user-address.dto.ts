import { IsNotEmpty, IsString, Length, Min, Max, IsInt } from 'class-validator';

export class CreateUserAddressDto {
  // 收货人：不能为空，字符串，长度 2-20
  @IsNotEmpty({ message: '收货人不能为空' })
  @IsString({ message: '收货人必须是字符串' })
  @Length(2, 20, { message: '收货人长度在2-20之间' })
  receiver: string;

  // 联系方式：手机号/固定电话，不能为空
  @IsNotEmpty({ message: '联系方式不能为空' })
  @IsString({ message: '联系方式必须是字符串' })
  contact: string;

  // 省份编码
  @IsNotEmpty({ message: '省份编码不能为空' })
  @IsString()
  provinceCode: string;

  // 城市编码
  @IsNotEmpty({ message: '城市编码不能为空' })
  @IsString()
  cityCode: string;

  // 区县编码
  @IsNotEmpty({ message: '区县编码不能为空' })
  @IsString()
  countyCode: string;

  // 详细地址
  @IsNotEmpty({ message: '详细地址不能为空' })
  @IsString()
  @Length(5, 100, { message: '详细地址长度在5-100之间' })
  address: string;

  // 是否默认地址：0=否 1=是
  @IsInt({ message: '是否默认只能是数字 0 或 1' })
  @Min(0)
  @Max(1)
  isDefault: number;
}
