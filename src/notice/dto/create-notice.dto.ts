import { IsString } from 'class-validator';

export class CreateNoticeDto {
  @IsString({ message: '公告内容必须是字符串' })
  content: string;
}
