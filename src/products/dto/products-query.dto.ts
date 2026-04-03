import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GuessQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class SearchProductsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  // 二级分类ID（对应 products.category_id）
  @IsOptional()
  @IsString()
  categoryId?: string;

  // 是否上架：1=上架，0=下架（前端按数字传参）
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  available?: 0 | 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  // 排序字段（只能选一个）
  @IsOptional()
  @IsIn(['price', 'stock', 'orderNum'])
  sortBy?: 'price' | 'stock' | 'orderNum';

  // 排序方式
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
