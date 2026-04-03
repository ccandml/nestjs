import { Global, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductDetailImage } from './entities/product-detail-images.entity';
import { ProductDetailProperty } from './entities/product-detail-properties.entity';
import { ProductMainImage } from './entities/product-main-images.entity';
import { ProductSkuSpec } from './entities/product-sku-specs.entity';
import { ProductSku } from './entities/product-skus.entity';
import { ProductSpecValue } from './entities/product-spec-values.entity';
import { ProductSpec } from './entities/product-specs.entity';
import { Product } from './entities/product.entity';
import { AdminProductsController } from './admin-products.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductSpec,
      ProductSpecValue,
      ProductSku,
      ProductSkuSpec,
      ProductMainImage,
      ProductDetailProperty,
      ProductDetailImage,
    ]),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
