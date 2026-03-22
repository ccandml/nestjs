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
import { CartItemService } from './cart-item.service';
import {
  UpdateAllCartSelectedDto,
  UpdateCartItemDto,
  UpdateCartSelectedDto,
} from './dto/update-cart-item.dto';
import { JwtGuard } from 'src/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('cart-item')
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  // 添加购物车
  @Post()
  addToCart(@Req() req, @Body() dto: UpdateCartItemDto) {
    dto.userId = req.user.userId;
    return this.cartItemService.addToCart(dto);
  }
  // 查询购物车
  @Get()
  getCartList(@Req() req) {
    return this.cartItemService.getCartList(req.user.userId);
  }
  // 修改购物车数量
  @Patch('/:id')
  updateCartItemCount(@Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.cartItemService.updateCartItemCount(id, dto);
  }
  // 删除购物车
  @Delete('/:id')
  removeCartItem(@Param('id') id: string) {
    return this.cartItemService.removeCartItem(id);
  }
  // 购物车全选
  @Patch('/selected/all')
  updateAllCartSelected(@Req() req, @Body() dto: UpdateAllCartSelectedDto) {
    return this.cartItemService.updateAllCartSelected(req.user.userId, dto.selected);
  }
  // 修改购物车选中状态
  @Patch('/:id/selected')
  updateCartItemSelected(
    @Param('id') id: string,
    @Body() dto: UpdateCartSelectedDto,
  ) {
    return this.cartItemService.updateCartItemSelected(id, dto.selected);
  }
}
