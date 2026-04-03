import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('admin-categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // 精简分类数据（字段结构：ClassifyResult）
  @Get('detail')
  getClassifyResult() {
    return this.categoriesService.getClassifyResult();
  }
}
