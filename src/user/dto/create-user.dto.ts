import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  Length,
} from 'class-validator';
import { Gender, GENDER_VALUES } from '../entities/user.entity'; // 路径按你项目改

export class CreateUserDto {
  @IsString()
  @Length(3, 50)
  username: string;

  @IsString()
  @Length(6, 100)
  password: string;

  @IsOptional()
  @IsEnum(GENDER_VALUES)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsString()
  avatar: string;

  @IsOptional()
  @IsString()
  fullLocation?: string;

  @IsOptional()
  @IsString()
  profession?: string;
}
