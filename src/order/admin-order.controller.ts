import {
  Controller,
  Get,
  Query,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AdminQueryOrderDto } from './dto/admin-query-order.dto';
import { AdminUpdateOrderStateDto } from './dto/admin-update-order-state.dto';

import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Roles(RolesDecoratorEnum.Admin)
@UseGuards(JwtGuard, RolesGuard)
@Controller('admin-order')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  // 管理端订单列表（分页 + 筛选 + 单字段排序）
  @Get('list')
  getOrderList(@Query() query: AdminQueryOrderDto) {
    return this.orderService.queryAdminOrderList(query);
  }

  // 管理端订单详情（按订单id）
  @Get('detail')
  getOrderDetail(@Query('id') id: string) {
    return this.orderService.queryAdminOrderDetail(id);
  }

  // 管理端修改订单状态（PUT /admin-order/:id）
  @Put(':id')
  updateOrderState(
    @Param('id') orderId: string,
    @Body() dto: AdminUpdateOrderStateDto,
  ) {
    return this.orderService.updateAdminOrderState(orderId, dto.orderState);
  }
}
