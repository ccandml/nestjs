import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { BuyNowDto, CreateOrderFromCartDto } from './dto/create-order.dto';
import { JwtGuard } from 'src/guards/jwt.guard';

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
}
