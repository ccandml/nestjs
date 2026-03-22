import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { CartItemService } from '../cart-item/cart-item.service';
import { UserAddressService } from 'src/user-address/user-address.service';
import { ProductsService } from 'src/products/products.service';
import { ProductSku } from 'src/products/entities/product-skus.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private cartItemService: CartItemService,
    private addressService: UserAddressService,
    private productsService: ProductsService,
  ) {}
  /* 思路： 两个接口入口，一个实现逻辑*/

  // 立即购买预览
  async getBuyNowPreview(
    userId: string,
    dto: {
      skuId: string;
      count: string;
    },
  ) {
    const { skuId, count } = dto;
    const num = Number(count);
    if (!Number.isInteger(num) || num <= 0) {
      throw new BadRequestException('购买数量不合法');
    }
    const items = [{ skuId, count: num }];
    return this.buildOrderPreview(userId, items);
  }

  // 购物车购买预览
  async getCartPreview(userId: string) {
    const cartList = await this.cartItemService.getSelectedCartItems(userId);
    if (!cartList.length) {
      throw new BadRequestException('未选择任何商品');
    }
    const items = cartList.map((item) => ({
      skuId: item.skuId,
      count: item.quantity,
    }));
    return this.buildOrderPreview(userId, items);
  }

  // 构建预览商品（管“商品计算”）
  private buildPreviewGoods(
    items: { skuId: string; count: number }[],
    skuList: ProductSku[],
  ) {
    const skuMap = new Map(skuList.map((sku) => [sku.id, sku]));

    let totalPrice = 0;

    const goods = items.map((item) => {
      const sku = skuMap.get(item.skuId);

      if (!sku) {
        throw new NotFoundException(`SKU不存在: ${item.skuId}`);
      }

      const price = Number(sku.price);
      const itemTotalPrice = price * item.count;

      totalPrice += itemTotalPrice;

      return {
        skuId: sku.id,
        spuId: sku.productId,
        name: sku.product.name,
        picture: sku.imageUrl || sku.product.mainImage || '',
        attrsText: this.buildAttrsText(sku),
        price: Number(sku.price),
        count: item.count,
        totalPrice: Number(itemTotalPrice.toFixed(2)),
      };
    });

    return {
      goods,
      totalPrice,
    };
  }

  // 核心预览方法（管“页面组装”）
  async buildOrderPreview(
    userId: string,
    items: { skuId: string; count: number }[],
  ) {
    if (!items.length) {
      throw new BadRequestException('预览商品不能为空');
    }
    // 1. 校验库存 + 获取 sku
    const skuList = await this.productsService.validateSkuStock(items);
    // 2. 构建预览商品 + 金额
    const { goods, totalPrice } = this.buildPreviewGoods(items, skuList);
    // 3. 获取用户地址列表
    const userAddresses = await this.addressService.getUserAddressList(userId);
    // 4. 汇总
    const postFee = 0;
    const totalPayPrice = totalPrice + postFee;
    return {
      goods,
      summary: {
        totalPrice: Number(totalPrice.toFixed(2)),
        postFee: Number(postFee.toFixed(2)),
        totalPayPrice: Number(totalPayPrice.toFixed(2)),
      },
      userAddresses,
    };
  }

  // 立即购买（商品详情页）
  async buyNow(
    userId: string,
    dto: {
      skuId: string;
      count: string;
      addressId: string;
    },
  ) {
    const { skuId, count, addressId } = dto;
    const num = Number(count);
    if (!Number.isInteger(num) || num <= 0) {
      throw new BadRequestException('购买数量不合法');
    }
    const items = [{ skuId, count: num }];
    return this.createOrder(userId, addressId, items, false);
  }

  // 购物车购买（购物车下单）
  async createFromCart(userId: string, dto: { addressId: string }) {
    const { addressId } = dto;
    // 获取购物车选中商品
    const cartList = await this.cartItemService.getSelectedCartItems(userId);
    if (!cartList.length) {
      throw new BadRequestException('未选择任何商品');
    }
    const items = cartList.map((item) => ({
      skuId: item.skuId,
      count: item.quantity,
    }));
    return this.createOrder(userId, addressId, items, true);
  }

  // 拼接规格字段
  private buildAttrsText(sku: ProductSku) {
    if (!sku.skuSpecs?.length) {
      return '';
    }
    return sku.skuSpecs
      .map((item) => `${item.spec.specName}:${item.specValue.valueName}`)
      .join(' ');
  }
  // 订单编号
  private generateOrderNo() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 9000 + 1000).toString();
    return `${prefix}${timestamp}${random}`;
  }

  // 核心下单 （生成订单快照、订单表）-->  写入数据库
  async createOrder(
    userId: string,
    addressId: string,
    items: { skuId: string; count: number }[],
    fromCart: boolean,
  ) {
    if (!items.length) {
      throw new BadRequestException('下单商品不能为空');
    }
    // 1. 地址
    const address = await this.addressService.getAddressById(userId, addressId);
    if (!address) {
      throw new NotFoundException('收货地址不存在');
    }
    // 2. 校验库存 + 获取 sku
    const skuList = await this.productsService.validateSkuStock(items);
    const skuMap = new Map(skuList.map((sku) => [sku.id, sku]));
    // 3. 构建订单商品 + 金额
    let totalPrice = 0;
    const orderItems: Partial<OrderItem>[] = [];
    for (const item of items) {
      const sku = skuMap.get(item.skuId);
      if (!sku) {
        throw new NotFoundException(`SKU不存在: ${item.skuId}`);
      }
      const price = Number(sku.price);
      // 每件商品的总额
      const itemTotal = price * item.count;

      totalPrice += itemTotal;

      orderItems.push({
        userId,
        skuId: sku.id,
        spuId: sku.productId,
        name: sku.product.name,
        picture: sku.imageUrl || sku.product.mainImage || '',
        attrsText: this.buildAttrsText(sku),
        price: sku.price,
        payPrice: sku.price,
        quantity: item.count,
        totalPrice: itemTotal.toFixed(2),
        totalPayPrice: itemTotal.toFixed(2),
      });
    }

    const postFee = 0;
    const totalPayPrice = totalPrice + postFee;

    // 4. 事务
    return this.dataSource.transaction(async (manager) => {
      // 订单表
      const order = manager.create(Order, {
        userId,
        orderNo: this.generateOrderNo(),
        orderState: 1,
        // 支付方式：创建阶段默认在线支付（未支付）
        payType: 1,
        payChannel: null,
        // 收货人姓名
        receiverContact: address.receiver,
        // 联系方式
        receiverMobile: address.contact,
        receiverAddress: address.address,

        totalMoney: totalPrice.toFixed(2),
        postFee: postFee.toFixed(2),
        payMoney: totalPayPrice.toFixed(2),
      });

      const savedOrder = await manager.save(Order, order);

      // 订单商品(快照表)
      const entities = orderItems.map((item) =>
        manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );

      await manager.save(OrderItem, entities);

      // 扣库存
      await this.productsService.decreaseSkuStock(items, manager);

      // 清购物车
      if (fromCart) {
        await this.cartItemService.removeSelectedItems(userId, manager);
      }

      return savedOrder;
    });
  }
}
