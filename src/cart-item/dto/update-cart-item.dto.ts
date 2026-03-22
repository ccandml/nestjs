import { PartialType } from '@nestjs/mapped-types';
import { CreateCartItemDto } from './create-cart-item.dto';
import { IsBoolean, IsString } from 'class-validator';

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {}

export class UpdateCartSelectedDto {
  @IsBoolean()
  selected: boolean;
}

export class UpdateAllCartSelectedDto {
  @IsString()
  userId: string;

  @IsBoolean()
  selected: boolean;
}
