import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class QueryOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  orderState: number = 0;
}
