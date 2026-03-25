import { Module } from '@nestjs/common';
import { RecommendService } from './recommend.service';
import { RecommendController } from './recommend.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recommend } from './entities/recommend.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recommend, Product, Category])],
  controllers: [RecommendController],
  providers: [RecommendService],
})
export class RecommendModule {}
