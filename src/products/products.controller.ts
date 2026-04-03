import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  GuessQueryDto,
  SearchProductsQueryDto,
} from './dto/products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 商品搜索
  @Get('search')
  searchProducts(@Query() query: SearchProductsQueryDto) {
    // 兼容历史路由，复用同一套查询逻辑
    return this.productsService.queryProductsList(query);
  }

  // 获取”猜你喜欢“商品列表
  @Get('guessLike')
  getGuessLikeProducts(@Query() query: GuessQueryDto) {
    return this.productsService.getGuessLikeProducts(query);
  }

  // 获取商品详情
  @Get('goodsDetail')
  getProductDetail(@Query('id') id: string) {
    return this.productsService.getProductDetail(id);
  }
}
