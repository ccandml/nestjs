import { IsString, IsNotEmpty, Length } from 'class-validator';

export class SigninUserDTO {
  @IsString()
  @IsNotEmpty()
  @Length(2, 64, {
    /**
     * $value 当前用户传入的值
     * $property 当前属性名
     * $target 当前类
     * $constraint1 第一个参数(2) ...
     */
    message: '用户名长度必须在$constraint1和$constraint2之间，当前值：$value',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  password: string;
}
