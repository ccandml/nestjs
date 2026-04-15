import { Module } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { NoticeController } from './notice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notice } from './entities/notice.entity';
import { AdminNoticeController } from './admin-notice.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notice])],
  controllers: [NoticeController, AdminNoticeController],
  providers: [NoticeService],
})
export class NoticeModule {}
