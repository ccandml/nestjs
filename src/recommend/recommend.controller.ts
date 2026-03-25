import { Controller, Get, Query } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendList, RecommendDetails } from './types/result.d';

@Controller('recommend')
export class RecommendController {
  constructor(private readonly recommendService: RecommendService) {}

  /**
   * 获取推荐列表接口
   * @returns 返回符合前端要求格式的推荐数据
   */
  @Get('list')
  async getList(@Query('type') type?: string): Promise<RecommendList[]> {
    return this.recommendService.getRecommendList(Number(type));
  }

  /**
   * 获取推荐详情接口
   * @returns 返回推荐模块的详细数据，包含所有子分类及对应的随机商品
   */
  @Get('details')
  async getRecommendDetails(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<RecommendDetails> {
    return this.recommendService.getRecommendDetails(
      Number(type),
      Number(page),
      Number(pageSize),
    );
  }
}
