import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { CartItemService } from './cart-item.service';
import {
  UpdateAllCartSelectedDto,
  UpdateCartMutationDto,
} from './dto/update-cart-item.dto';
import { JwtGuard } from 'src/guards/jwt.guard';
import { CreateCartItemDto } from './dto/create-cart-item.dto';

@UseGuards(JwtGuard)
@Controller('cart-item')
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  // 添加购物车
  @Post()
  addToCart(@Req() req, @Body() dto: CreateCartItemDto) {
    return this.cartItemService.addToCart(req.user.userId, dto);
  }
  // 查询购物车
  @Get()
  getCartList(@Req() req) {
    return this.cartItemService.getCartList(req.user.userId);
  }
  // 修改购物车（数量/选中状态）
  @Put('/:id')
  updateCartItem(@Param('id') id: string, @Body() dto: UpdateCartMutationDto) {
    return this.cartItemService.updateCartItem(id, dto);
  }
  // 删除购物车
  @Delete('/:id')
  removeCartItem(@Param('id') id: string) {
    return this.cartItemService.removeCartItem(id);
  }
  // 购物车全选
  @Put('/selected/all')
  updateAllCartSelected(@Req() req, @Body() dto: UpdateAllCartSelectedDto) {
    return this.cartItemService.updateAllCartSelected(
      req.user.userId,
      dto.selected,
    );
  }
}
