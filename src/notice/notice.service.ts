import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { Notice } from './entities/notice.entity';
import { Repository } from 'typeorm';

@Injectable()
export class NoticeService {
  // 公告表只维护一条记录：固定主键为 1。
  private static readonly SINGLE_NOTICE_ID = '1';

  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  async upsertNotice(createNoticeDto: CreateNoticeDto): Promise<Notice> {
    await this.noticeRepository.upsert(
      {
        id: NoticeService.SINGLE_NOTICE_ID,
        content: createNoticeDto.content,
      },
      ['id'],
    );

    return this.noticeRepository.findOneByOrFail({
      id: NoticeService.SINGLE_NOTICE_ID,
    });
  }

  async getNoticeContent(): Promise<{ content: string }> {
    const notice = await this.noticeRepository.findOneBy({
      id: NoticeService.SINGLE_NOTICE_ID,
    });

    return {
      content: notice?.content || '',
    };
  }
}
