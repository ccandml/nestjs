import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // 分类页数据（一级分类 + 二级分类 + 商品）
  @Get()
  getClassifyData() {
    return this.categoriesService.getClassifyData();
  }

  // 分类导航数据
  @Get('navs')
  getCategoryNavs() {
    return this.categoriesService.getCategoryNavs();
  }
}
