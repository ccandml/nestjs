import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CartItem } from './entities/cart-item.entity';
import { EntityManager, Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartItemService {
  constructor(
    @InjectRepository(CartItem)
    private cartRepository: Repository<CartItem>,
    private productsService: ProductsService,
  ) {}
  // 添加购物车
  async addToCart(dto: UpdateCartItemDto) {
    const { userId, skuId, count } = dto;
    // 1. 查 SKU
    const sku = await this.productsService.findSku(skuId);
    if (!sku) {
      throw new NotFoundException('SKU 不存在');
    }
    // 2. 校验库存
    if (count > sku.stock) {
      throw new BadRequestException('库存不足');
    }
    // 3. 查购物车是否已有
    const existing = await this.cartRepository.findOne({
      where: { userId, skuId },
    });
    if (existing) {
      // 4. 已存在 → 累加
      const newQuantity = existing.quantity + count;
      // 再校验一次库存
      if (newQuantity > sku.stock) {
        throw new Error('超过库存');
      }
      existing.quantity = newQuantity;
      await this.cartRepository.save(existing);
    } else {
      // 4B. 不存在 → 新增
      const cartItem = this.cartRepository.create({
        userId,
        productId: sku.productId, // 注意这里
        skuId,
        quantity: count,
        selected: true,
      });
      await this.cartRepository.save(cartItem);
    }
    return { success: true };
  }

  // 获取购物车列表
  async getCartList(userId: string) {
    // 1. 查购物车
    const cartItems = await this.cartRepository.find({
      where: { userId },
    });
    if (!cartItems.length) return [];
    // 2. 收集 skuIds
    const skuIds = cartItems.map((item) => item.skuId);
    // 3. 查 SKU（带规格）
    const skus = await this.productsService.findSkusByIds(skuIds);
    const skuMap = new Map(skus.map((sku) => [sku.id, sku]));
    // 4. 收集 productIds
    const productIds = skus.map((sku) => sku.productId);
    // 5. 查商品（带主图）
    const products = await this.productsService.findProductsByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));
    // 6. 组装返回数据
    return cartItems.map((cart) => {
      const sku = skuMap.get(cart.skuId);
      const product = sku ? productMap.get(sku.productId) : null;
      // 👉 规格拼接
      const attrsText =
        sku?.skuSpecs
          ?.map(
            (s) => `${s.spec?.specName || ''}：${s.specValue?.valueName || ''}`,
          )
          .join(' ') || '';
      // 👉 是否有效（关键）
      const isEffective = !!sku && !!product && sku.stock > 0;
      return {
        id: cart.id,
        skuId: cart.skuId,
        name: product?.name || '',
        picture: product?.mainImages?.[0]?.imageUrl || '',
        count: cart.quantity,
        // 加入时价格
        price: Number(sku?.price || 0),
        // 当前价格
        nowPrice: Number(sku?.price || 0),
        stock: sku?.stock || 0,
        selected: cart.selected,
        attrsText,
        isEffective,
      };
    });
  }

  // 修改购物车数量
  async updateCartItemCount(id: string, dto: UpdateCartItemDto) {
    const { count } = dto;
    // 1. 查购物车项
    const cartItem = await this.cartRepository.findOne({
      where: { id },
    });
    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }
    // 2. 查 SKU
    const sku = await this.productsService.findSku(cartItem.skuId);
    if (!sku) {
      throw new NotFoundException('SKU 不存在');
    }
    // 3. 校验库存
    if (count > sku.stock) {
      throw new BadRequestException('库存不足');
    }
    // 4. 更新数量
    cartItem.quantity = count;
    await this.cartRepository.save(cartItem);
    return {
      success: true,
    };
  }

  // 删除购物车
  async removeCartItem(id: string) {
    const result = await this.cartRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('购物车项不存在');
    }
    return {
      success: true,
    };
  }

  // 修改购物车选中状态
  async updateCartItemSelected(id: string, selected: boolean) {
    const cartItem = await this.cartRepository.findOne({
      where: { id },
    });
    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }
    cartItem.selected = selected;
    await this.cartRepository.save(cartItem);
    return {
      success: true,
    };
  }

  // 购物车全选
  async updateAllCartSelected(userId: string, selected: boolean) {
    await this.cartRepository.update({ userId }, { selected });
    return {
      success: true,
    };
  }

  // 获取购物车选中商品
  async getSelectedCartItems(userId: string) {
    return this.cartRepository.find({
      where: { userId, selected: true },
    });
  }

  // 删除购物车选中商品(事务)
  async removeSelectedItems(userId: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(CartItem)
      : this.cartRepository;
    const result = await repo.delete({
      userId,
      selected: true,
    });

    return result;
  }
}
