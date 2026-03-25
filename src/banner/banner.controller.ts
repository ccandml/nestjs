import { Controller, Get } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerList } from './types/result.d';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  async getBannerList(): Promise<BannerList[]> {
    return this.bannerService.getBannerList();
  }
}
