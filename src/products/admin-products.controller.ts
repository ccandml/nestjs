import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SearchProductsQueryDto } from './dto/products-query.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';

import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Roles(RolesDecoratorEnum.Admin)
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin-products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // 后台商品列表查询（分页 + 条件筛选 + 单字段排序）
  @Get('list')
  getProductsList(@Query() query: SearchProductsQueryDto) {
    return this.productsService.queryAdminProductsList(query);
  }

  // 后台商品详情（按商品ID返回全部SKU详情）
  @Get('detail')
  getProductDetail(@Query('id') id: string) {
    return this.productsService.getAdminProductDetailById(id);
  }

  // 后台SKU修改：仅允许修改状态/库存/划线价/售价
  @Patch('sku')
  updateSku(@Body() dto: UpdateSkuDto) {
    return this.productsService.updateAdminSku(dto);
  }
}
