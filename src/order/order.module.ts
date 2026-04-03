import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductsModule } from 'src/products/products.module';
import { UserAddressModule } from 'src/user-address/user-address.module';
import { CartItemModule } from 'src/cart-item/cart-item.module';
import { AdminOrderController } from './admin-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductsModule,
    UserAddressModule,
    CartItemModule,
  ],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService],
})
export class OrderModule {}
