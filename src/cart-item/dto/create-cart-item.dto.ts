import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCartItemDto {
  @IsString()
  @IsNotEmpty()
  skuId: string;
  @IsInt()
  @Min(1)
  count: number;
}
