import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';
import { User } from './user/user.entity';
import { Profile } from './user/profile.entity';
import { Logs } from './logs/logs.entity';
import { Roles } from './roles/roles.entity';
import { ConfigEnum } from './enum/config.enum';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { Menus } from './menu/entities/menu.entity';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { Category } from './categories/entities/category.entity';
import { Product } from './products/entities/product.entity';
import { ProductSpec } from './products/entities/product-specs.entity';
import { ProductSpecValue } from './products/entities/product-spec-values.entity';
import { ProductSku } from './products/entities/product-skus.entity';
import { ProductSkuSpec } from './products/entities/product-sku-specs.entity';
import { ProductMainImage } from './products/entities/product-main-images.entity';
import { ProductDetailProperty } from './products/entities/product-detail-properties.entity';
import { ProductDetailImage } from './products/entities/product-detail-images.entity';
import { CartItemModule } from './cart-item/cart-item.module';
import { CartItem } from './cart-item/entities/cart-item.entity';
import { UserAddressModule } from './user-address/user-address.module';
import { UserAddress } from './user-address/entities/user-address.entity';
import { OrderModule } from './order/order.module';
import { Order } from './order/entities/order.entity';
import { OrderItem } from './order/entities/order-item.entity';

const envFilePath = `.env.${process.env.NODE_ENV || `development`}`;

@Module({
  imports: [
    // 全局管家，拿到env的配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', envFilePath], // 先读env， 后读envFilePath(后者覆盖前者)
      validationSchema: Joi.object({
        // 校验数据库配置的类型和必填性
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(3307),
        DB_USERNAME: Joi.string().default('root'),
        DB_PASSWORD: Joi.string().default('example'),
        DB_DATABASE: Joi.string().default('testdb'),
        DB_SYNCHRONIZE: Joi.boolean().default(true),
      }),
    }),
    // 异步配置TypeORM（动态读取环境变量）
    TypeOrmModule.forRootAsync({
      // 声明依赖：工厂函数需要ConfigService
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get(ConfigEnum.DB_HOST),
        port: configService.get(ConfigEnum.DB_PORT),
        username: configService.get(ConfigEnum.DB_USERNAME),
        password: configService.get(ConfigEnum.DB_PASSWORD),
        database: configService.get(ConfigEnum.DB_DATABASE),
        entities: [
          User,
          Profile,
          Logs,
          Roles,
          Menus,
          Category,
          Product,
          ProductSpec,
          ProductSpecValue,
          ProductSku,
          ProductSkuSpec,
          ProductMainImage,
          ProductDetailProperty,
          ProductDetailImage,
          CartItem,
          UserAddress,
          Order,
          OrderItem,
        ],
        synchronize: true,
        logging: true, // 打印SQL日志
      }),
    }),
    UserModule,
    RolesModule,
    LogsModule,
    AuthModule,
    MenuModule,
    CategoriesModule,
    ProductsModule,
    CartItemModule,
    UserAddressModule,
    OrderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
