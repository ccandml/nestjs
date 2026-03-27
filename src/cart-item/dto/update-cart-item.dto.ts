import { PartialType } from '@nestjs/mapped-types';
import { CreateCartItemDto } from './create-cart-item.dto';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {}

export class UpdateCartMutationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class UpdateAllCartSelectedDto {
  @IsBoolean()
  selected: boolean;
}
