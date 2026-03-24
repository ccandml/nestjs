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
} from '@nestjs/common';
import { OrderService } from './order.service';
import { BuyNowDto, CreateOrderFromCartDto } from './dto/create-order.dto';
import { JwtGuard } from 'src/guards/jwt.guard';
import { QueryOrderDto } from './dto/query-order.dto';

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

  // 立即购买 -> 创建订单
  @Post('buy-now')
  buyNow(
    @Req() req,
    @Body()
    dto: BuyNowDto,
  ) {
    return this.orderService.buyNow(req.user.userId, dto);
  }

  // 购物车下单 -> 创建订单
  @Post('cart')
  createFromCart(
    @Req() req,
    @Body()
    dto: CreateOrderFromCartDto,
  ) {
    return this.orderService.createFromCart(req.user.userId, dto);
  }

  // 获取订单列表
  @Get()
  findOrderList(@Req() req: any, @Query() queryDto: QueryOrderDto) {
    const userId = req.user.userId;
    return this.orderService.findOrderList(userId, queryDto);
  }

  // 获取订单详情
  @Get(':id')
  findOrderDetail(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
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
}
