import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GuessQueryDto } from './dto/products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
