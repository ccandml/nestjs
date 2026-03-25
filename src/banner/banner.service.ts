import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { BannerList } from './types/result.d';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
  ) {}

  async getBannerList(): Promise<BannerList[]> {
    const banners = await this.bannerRepository.find({
      order: { id: 'ASC' },
    });

    return banners.map((item) => ({
      id: item.id,
      hrefUrl: item.hrefUrl,
      imgUrl: item.imgUrl,
      type: Number(item.type) || 0,
    }));
  }
}
