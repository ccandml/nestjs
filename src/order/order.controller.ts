import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderCreateParams } from './dto/create-order.dto';
import { JwtGuard } from 'src/guards/jwt.guard';
import { QueryOrderDto } from './dto/query-order.dto';
import { LogisticItem } from './types/result';

@UseGuards(JwtGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // 立即购买预览
  @Post('pre/now')
  getBuyNowPreview(@Req() req, @Body() dto) {
    return this.orderService.getBuyNowPreview(req.user.userId, dto);
  }

  // 购物车购买预览
  @Get('pre')
  getCartPreview(@Req() req) {
    return this.orderService.getCartPreview(req.user.userId);
  }

  // 创建订单（统一入参）
  @Post()
  create(@Req() req, @Body() dto: OrderCreateParams) {
    return this.orderService.create(req.user.userId, dto);
  }

  // 获取订单列表
  @Get()
  findOrderList(@Req() req: any, @Query() queryDto: QueryOrderDto) {
    const userId = req.user.userId;
    return this.orderService.findOrderList(userId, queryDto);
  }

  // 获取物流日志
  @Get('logistics/:id')
  findLogistics(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<LogisticItem[]> {
    const userId = req.user.userId;
    return this.orderService.findLogistics(userId, id);
  }

  // 获取订单详情
  @Get(':id')
  findOrderDetail(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.findOrderDetail(userId, id);
  }

  /** 确认支付 */
  @Put('pay/:id')
  payOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.payOrder(userId, id);
  }

  /** 手动模拟发货 */
  @Put('consign/:id')
  consignOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.consignOrder(userId, id);
  }

  /** 确认收货 */
  @Put('receipt/:id')
  receiptOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.receiptOrder(userId, id);
  }

  /** 取消订单 */
  @Put('cancel/:id')
  cancelOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.cancelOrder(userId, id);
  }

  /** 删除订单（逻辑删除：隐藏） */
  @Delete(':id')
  removeOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.orderService.hideOrder(userId, id);
  }
}
