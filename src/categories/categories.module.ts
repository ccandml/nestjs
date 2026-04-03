import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Product } from 'src/products/entities/product.entity';
import { CategoryNav } from './entities/category-nav.entity';
import { AdminCategoriesController } from './admin-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product, CategoryNav])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
