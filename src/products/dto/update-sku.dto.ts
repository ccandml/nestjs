import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateSkuDto {
  @IsString()
  id: string;

  // 兼容前端可能传的 boolean / 0|1 / 'true'|'false' / '0'|'1'
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true;
    }
    if (value === false || value === 0 || value === '0' || value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  inventory?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  oldPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}
