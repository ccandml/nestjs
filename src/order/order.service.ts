import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, In, Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { CartItemService } from '../cart-item/cart-item.service';
import { UserAddressService } from 'src/user-address/user-address.service';
import { ProductsService } from 'src/products/products.service';
import { ProductSku } from 'src/products/entities/product-skus.entity';
import { QueryOrderDto } from './dto/query-order.dto';

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

  // 查询订单列表
  async findOrderList(userId: string, queryDto: QueryOrderDto) {
    const { page = 1, pageSize = 10, orderState = 0 } = queryDto;
    /** ================== 1️⃣ 查询订单（分页 + 状态筛选） ================== */
    const qb = this.orderRepository.createQueryBuilder('order');
    qb.where('order.userId = :userId', { userId });
    // 状态筛选（0 = 全部）
    if (orderState !== 0) {
      qb.andWhere('order.orderState = :orderState', { orderState });
    }
    qb.orderBy('order.createTime', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);
    const [orders, counts] = await qb.getManyAndCount();
    // 没数据直接返回
    if (orders.length === 0) {
      return {
        counts,
        items: [],
        page,
        pages: Math.ceil(counts / pageSize),
        pageSize,
      };
    }
    /** ================== 2️⃣ 批量查订单商品（避免 N+1） ================== */
    const orderIds = orders.map((item) => item.id);
    const orderItems = await this.orderItemRepository.find({
      where: {
        orderId: In(orderIds),
      },
    });
    /** ================== 3️⃣ 按 orderId 分组 ================== */
    const orderItemsMap: Record<string, OrderItem[]> = {};
    for (const item of orderItems) {
      const key = String(item.orderId);
      if (!orderItemsMap[key]) {
        orderItemsMap[key] = [];
      }
      orderItemsMap[key].push(item);
    }
    /** ================== 4️⃣ 组装返回数据 ================== */
    const items = orders.map((order) => {
      const currentItems = orderItemsMap[String(order.id)] ?? [];
      /** 👉 商品列表转换（order_items → skus） */
      const skus = currentItems.map((item) => ({
        id: String(item.skuId),
        spuId: String(item.spuId),
        name: item.name ?? '',
        attrsText: item.attrsText ?? '',
        quantity: Number(item.quantity ?? 0),
        curPrice: Number(item.payPrice ?? 0),
        image: item.picture ?? '',
      }));
      /** 👉 商品总数量 */
      const totalNum = currentItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      /** 👉 倒计时（只针对待付款） */
      let countdown = -1;
      if (Number(order.orderState) === 1 && order.createTime) {
        const createTime = new Date(order.createTime).getTime();
        if (!Number.isNaN(createTime)) {
          const deadline = createTime + 30 * 60 * 1000; // 30分钟
          const remain = Math.floor((deadline - Date.now()) / 1000);
          countdown = remain > 0 ? remain : -1;
        }
      }
      /** 👉 时间格式化 */
      let createTimeStr = '';
      if (order.createTime) {
        const d = new Date(order.createTime);
        if (!Number.isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const h = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          const s = String(d.getSeconds()).padStart(2, '0');
          createTimeStr = `${y}-${m}-${day} ${h}:${min}:${s}`;
        }
      }
      return {
        id: String(order.id),
        orderState: Number(order.orderState),
        countdown,
        skus,

        receiverContact: order.receiverContact ?? '',
        receiverMobile: order.receiverMobile ?? '',
        receiverAddress: order.receiverAddress ?? '',

        createTime: createTimeStr,

        totalMoney: Number(order.totalMoney ?? 0),
        postFee: Number(order.postFee ?? 0),
        payMoney: Number(order.payMoney ?? 0),

        totalNum,
      };
    });
    /** ================== 5️⃣ 返回分页数据 ================== */
    return {
      counts,
      items,
      page,
      pages: Math.ceil(counts / pageSize),
      pageSize,
    };
  }

  // 查询订单详情
  async findOrderDetail(userId: string, orderId: string) {
    /** ================== 1️⃣ 查询订单主表 ================== */
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId, // 只能查当前用户自己的订单
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    /** ================== 2️⃣ 查询该订单下的商品 ================== */
    const orderItems = await this.orderItemRepository.find({
      where: {
        orderId: order.id as any,
      },
      order: {
        id: 'ASC',
      },
    });

    /** ================== 3️⃣ 转换商品列表（order_items -> skus） ================== */
    const skus = orderItems.map((item) => ({
      id: String(item.skuId),
      spuId: String(item.spuId),
      name: item.name ?? '',
      attrsText: item.attrsText ?? '',
      quantity: Number(item.quantity ?? 0),
      curPrice: Number(item.payPrice ?? 0),
      image: item.picture ?? '',
    }));

    /** ================== 4️⃣ 计算倒计时（仅待付款） ================== */
    let countdown = -1;
    if (Number(order.orderState) === 1 && order.createTime) {
      const createTime = new Date(order.createTime).getTime();

      if (!Number.isNaN(createTime)) {
        const deadline = createTime + 30 * 60 * 1000; // 30分钟未支付自动失效
        const remain = Math.floor((deadline - Date.now()) / 1000);
        countdown = remain > 0 ? remain : -1;
      }
    }

    /** ================== 5️⃣ 格式化下单时间 ================== */
    let createTimeStr = '';
    if (order.createTime) {
      const d = new Date(order.createTime);

      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');

        createTimeStr = `${y}-${m}-${day} ${h}:${min}:${s}`;
      }
    }

    /** ================== 6️⃣ 返回前端详情结构 ================== */
    return {
      id: String(order.id),
      orderState: Number(order.orderState),
      countdown,
      skus,

      receiverContact: order.receiverContact ?? '',
      receiverMobile: order.receiverMobile ?? '',
      receiverAddress: order.receiverAddress ?? '',

      createTime: createTimeStr,

      totalMoney: Number(order.totalMoney ?? 0),
      postFee: Number(order.postFee ?? 0),
      payMoney: Number(order.payMoney ?? 0),
    };
  }

  /** 确认支付：待付款 -> 待发货 */
  async payOrder(userId: string, orderId: string) {
    // 只能操作自己的订单
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
      },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    // 只有待付款才能确认支付
    if (Number(order.orderState) !== 1) {
      throw new BadRequestException('当前订单状态不能确认支付');
    }
    // 更新状态和支付时间
    order.orderState = 2 as any;
    order.payTime = new Date() as any;

    await this.orderRepository.save(order);

    return {
      id: String(order.id),
      orderState: Number(order.orderState),
      message: '支付成功',
    };
  }

  /** 手动模拟发货：待发货 -> 待收货 */
  async consignOrder(userId: string, orderId: string) {
    // 只能操作自己的订单
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 只有待发货才能发货
    if (Number(order.orderState) !== 2) {
      throw new BadRequestException('当前订单状态不能发货');
    }

    // 更新状态和发货时间
    order.orderState = 3 as any;
    order.deliveryTime = new Date() as any;

    await this.orderRepository.save(order);

    return {
      id: String(order.id),
      orderState: Number(order.orderState),
      message: '发货成功',
    };
  }

  /** 确认收货：待收货 -> 待评价 */
  async receiptOrder(userId: string, orderId: string) {
    // 只能操作自己的订单
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
      },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    // 只有待收货才能确认收货
    if (Number(order.orderState) !== 3) {
      throw new BadRequestException('当前订单状态不能确认收货');
    }
    // 更新状态和完成时间
    order.orderState = 4 as any;
    order.finishTime = new Date() as any;

    await this.orderRepository.save(order);

    return {
      id: String(order.id),
      orderState: Number(order.orderState),
      message: '确认收货成功',
    };
  }

  /** 取消订单：待付款 -> 已取消 */
  async cancelOrder(userId: string, orderId: string) {
    // 只能操作自己的订单
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
      },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    // 只有待付款才能取消
    if (Number(order.orderState) !== 1) {
      throw new BadRequestException('当前订单状态不能取消');
    }
    // 更新状态和取消时间
    order.orderState = 6 as any;
    order.cancelTime = new Date() as any;

    await this.orderRepository.save(order);

    return {
      id: String(order.id),
      orderState: Number(order.orderState),
      message: '取消订单成功',
    };
  }
}
