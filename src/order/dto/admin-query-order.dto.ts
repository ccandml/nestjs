import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminQueryOrderDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  // 订单状态筛选：0 表示全部，1-6 对应具体状态
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  orderState?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  // 只允许一个排序字段：总付价 或 创建时间
  @IsOptional()
  @IsIn(['payMoney', 'createTime'])
  sortBy?: 'payMoney' | 'createTime';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
