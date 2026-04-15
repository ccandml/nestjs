import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Roles(RolesDecoratorEnum.SuperAdmin)
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin-notice')
export class AdminNoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  // 管理端新增/修改公告：统一写入同一条公告记录。
  @Post()
  upsertNotice(@Body() createNoticeDto: CreateNoticeDto) {
    return this.noticeService.upsertNotice(createNoticeDto);
  }
}
