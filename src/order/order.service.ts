import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { CartItemService } from '../cart-item/cart-item.service';
import { UserAddressService } from 'src/user-address/user-address.service';
import { ProductsService } from 'src/products/products.service';
import { ProductSku } from 'src/products/entities/product-skus.entity';
import { QueryOrderDto } from './dto/query-order.dto';
import { AdminQueryOrderDto } from './dto/admin-query-order.dto';
import { OrderCreateParams } from './dto/create-order.dto';
import {
  AdminOrderDetailResult,
  AdminOrderListResult,
  OrderResult,
  OrderListResult,
  LogisticItem,
} from './types/result';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class OrderService {
  // 超时未支付订单的支付过期时间（秒）
  private readonly PAYMENT_TIMEOUT_SECONDS = 60;

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

  // 统一计算返回给前端的 countdown（接口字段保持不变）
  private calcCountdown(order: Order, now = new Date()) {
    if (Number(order.orderState) !== 1) {
      return -1;
    }
    const expireMs = order.expireTime
      ? new Date(order.expireTime).getTime()
      : NaN;
    if (Number.isNaN(expireMs)) {
      return -1;
    }
    const remainMs = expireMs - now.getTime();
    if (remainMs <= 0) {
      return -1;
    }
    return Math.ceil(remainMs / 1000);
  }

  // 待支付订单超过60秒自动取消
  private async expireOrderIfNeeded(order: Order) {
    if (Number(order.orderState) !== 1) {
      return order;
    }

    // 与前端返回 countdown 使用同一套判断，避免出现 countdown=-1 但状态未更新
    if (this.calcCountdown(order) !== -1) {
      return order;
    }

    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({
        orderState: 6 as any,
        cancelReason: '超时未支付',
        // 取消时间由应用层生成，避免依赖数据库会话时区。
        cancelTime: new Date() as any,
      })
      .where('id = :id', { id: order.id })
      .andWhere('order_state = :orderState', { orderState: 1 })
      .execute();

    if (!result.affected) {
      return order;
    }

    const latestOrder = await this.orderRepository.findOne({
      where: { id: order.id as any },
    });
    return latestOrder || order;
  }

  // 查询列表前，先把该用户超时未支付订单统一转为已取消
  private async expireUserOrdersIfNeeded(userId: string) {
    const pendingOrders = await this.orderRepository.find({
      where: {
        userId,
        orderState: 1 as any,
        isVisible: 1,
      },
    });

    if (!pendingOrders.length) {
      return;
    }

    await Promise.all(
      pendingOrders.map((pendingOrder) =>
        this.expireOrderIfNeeded(pendingOrder),
      ),
    );
  }

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

  // 管理端订单列表：分页 + 筛选 + 单字段排序
  async queryAdminOrderList(
    query: AdminQueryOrderDto,
  ): Promise<AdminOrderListResult> {
    const {
      keyword,
      orderState,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'DESC',
    } = query;

    const qb = this.orderRepository
      .createQueryBuilder('o')
      .leftJoin(User, 'u', 'u.id = o.user_id')
      .select([
        'o.id AS id',
        'o.pay_money AS payMoney',
        'o.create_time AS createTime',
        'o.order_state AS orderState',
        'u.username AS username',
        'u.avatar AS userAvatar',
      ]);

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();
      // 支持用户名模糊匹配，或按订单id模糊匹配
      qb.andWhere(
        '(u.username LIKE :keyword OR CAST(o.id AS CHAR) LIKE :keyword)',
        {
          keyword: `%${normalizedKeyword}%`,
        },
      );
    }

    if (orderState !== undefined && orderState !== 0) {
      qb.andWhere('o.order_state = :orderState', { orderState });
    }

    const sortFieldMap: Record<
      NonNullable<AdminQueryOrderDto['sortBy']>,
      string
    > = {
      payMoney: 'o.pay_money',
      createTime: 'o.create_time',
    };

    if (sortBy) {
      qb.orderBy(sortFieldMap[sortBy], sortOrder);
    } else {
      qb.orderBy('o.create_time', 'DESC');
    }

    const total = await qb.getCount();
    const rows = await qb
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{
        id: string;
        payMoney: string;
        createTime: string;
        orderState: string;
        username: string | null;
        userAvatar: string | null;
      }>();

    return {
      counts: total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      items: rows.map((row) => ({
        id: row.id,
        userAvatar: row.userAvatar || '',
        username: row.username || '',
        totalPayPrice: Number(row.payMoney || 0),
        createTime: this.formatDateTime(row.createTime),
        orderState: Number(row.orderState),
      })),
    };
  }

  // 管理端订单详情：基础信息 + 收货金额信息 + SKU快照列表
  async queryAdminOrderDetail(
    orderId: string,
  ): Promise<AdminOrderDetailResult> {
    const order = await this.orderRepository
      .createQueryBuilder('o')
      .leftJoin(User, 'u', 'u.id = o.user_id')
      .select([
        'o.id AS id',
        'o.order_state AS orderState',
        'o.create_time AS createTime',
        'o.receiver_contact AS receiverContact',
        'o.receiver_mobile AS receiverMobile',
        'o.receiver_address AS receiverAddress',
        'o.post_fee AS postFee',
        'o.pay_money AS payMoney',
        'u.username AS username',
      ])
      .where('o.id = :orderId', { orderId })
      .getRawOne<{
        id: string;
        orderState: string;
        createTime: string;
        receiverContact: string;
        receiverMobile: string;
        receiverAddress: string;
        postFee: string;
        payMoney: string;
        username: string | null;
      }>();

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const skuRows = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select([
        'oi.sku_id AS skuId',
        'oi.picture AS picture',
        'oi.name AS name',
        'oi.attrs_text AS attrsText',
        'oi.pay_price AS payPrice',
        'oi.quantity AS quantity',
        'oi.total_pay_price AS totalPayPrice',
      ])
      .where('oi.order_id = :orderId', { orderId })
      .orderBy('oi.id', 'ASC')
      .getRawMany<{
        skuId: string;
        picture: string | null;
        name: string;
        attrsText: string | null;
        payPrice: string;
        quantity: string;
        totalPayPrice: string;
      }>();

    return {
      id: order.id,
      username: order.username || '',
      orderState: Number(order.orderState),
      createTime: this.formatDateTime(order.createTime),
      receiverContact: order.receiverContact,
      receiverMobile: order.receiverMobile,
      receiverAddress: order.receiverAddress,
      postFee: Number(order.postFee || 0),
      payMoney: Number(order.payMoney || 0),
      skus: skuRows.map((item) => ({
        skuId: item.skuId,
        picture: item.picture || '',
        name: item.name,
        attrsText: item.attrsText || '',
        payPrice: Number(item.payPrice || 0),
        quantity: Number(item.quantity || 0),
        totalPayPrice: Number(item.totalPayPrice || 0),
      })),
    };
  }

  // 管理端修改订单状态
  async updateAdminOrderState(
    orderId: string,
    orderState: number,
  ): Promise<{ id: string; orderState: number; message: string }> {
    // 查询订单是否存在
    const order = await this.orderRepository.findOne({
      where: { id: orderId as any },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 更新订单状态
    order.orderState = orderState as any;
    await this.orderRepository.save(order);

    return {
      id: order.id,
      orderState: Number(order.orderState),
      message: '订单状态更新成功',
    };
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
        totalPayPrice: Number(itemTotalPrice.toFixed(2)),
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
    // 4. 汇总
    const postFee = 0; // 运费
    const totalPayPrice = totalPrice + postFee;
    return {
      goods,
      summary: {
        totalPrice: Number(totalPrice.toFixed(2)),
        postFee: Number(postFee.toFixed(2)),
        totalPayPrice: Number(totalPayPrice.toFixed(2)),
      },
    };
  }

  // 创建订单（buy-now/cart 统一入口）
  async create(userId: string, dto: OrderCreateParams) {
    const { goods } = dto;
    if (!Array.isArray(goods) || goods.length === 0) {
      throw new BadRequestException('下单商品不能为空');
    }

    const items = goods.map((item) => {
      const count = Number(item.count);
      if (!item.skuId || !Number.isInteger(count) || count <= 0) {
        throw new BadRequestException('商品参数不合法');
      }
      return {
        skuId: item.skuId,
        count,
      };
    });

    const fromCart = await this.isSameAsSelectedCartItems(userId, items);
    return this.createOrder(userId, dto, items, fromCart);
  }

  // 如果提交商品与当前购物车已选商品完全一致，视为购物车下单
  private async isSameAsSelectedCartItems(
    userId: string,
    items: { skuId: string; count: number }[],
  ) {
    const cartList = await this.cartItemService.getSelectedCartItems(userId);
    if (!cartList.length || cartList.length !== items.length) {
      return false;
    }

    const cartMap = new Map(
      cartList.map((item) => [item.skuId, item.quantity]),
    );
    for (const item of items) {
      if (cartMap.get(item.skuId) !== item.count) {
        return false;
      }
    }

    return true;
  }

  // 格式化时间：ISO 格式转换为 YYYY-MM-DD HH:mm:ss 格式
  private formatDateTime(dateValue: any): string {
    if (!dateValue) return '';
    try {
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}:${s}`;
    } catch {
      return '';
    }
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

  /** 获取物流日志 */
  async findLogistics(
    userId: string,
    orderId: string,
  ): Promise<LogisticItem[]> {
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
        isVisible: 1,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (!order.deliveryTime) {
      throw new BadRequestException('订单未发货，暂无物流日志');
    }

    return [
      { id: '1', text: '包裹已出库，运输途中' },
      { id: '2', text: '商品已送到中转站，正在分配配送员' },
      { id: '3', text: '配送员已取件，即将开始派送' },
      { id: '4', text: '商品已签收，感谢您的使用' },
    ];
  }

  // 核心下单 （生成订单快照、订单表）-->  写入数据库
  async createOrder(
    userId: string,
    dto: OrderCreateParams,
    items: { skuId: string; count: number }[],
    fromCart: boolean,
  ) {
    const { addressId, deliveryTimeType, buyerMessage, payType, payChannel } =
      dto;
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
    // 下单时固化完整收货地址快照：省市区 + 详细地址，避免后续地址变更影响历史订单展示。
    const receiverAddressSnapshot = [address.fullLocation, address.address]
      .filter((part) => !!part && part.trim().length > 0)
      .join(' ')
      .trim();

    // 4. 事务
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const expireTime = new Date(
        now.getTime() + this.PAYMENT_TIMEOUT_SECONDS * 1000,
      );

      // 订单表
      const order = manager.create(Order, {
        userId,
        orderNo: this.generateOrderNo(),
        orderState: 1,
        isVisible: 1,
        createTime: now,
        expireTime,
        deliveryTimeType,
        buyerMessage,
        payType,
        payChannel: payType === 1 ? payChannel : null,
        // 收货人姓名
        receiverContact: address.receiver,
        // 联系方式
        receiverMobile: address.contact,
        receiverAddress: receiverAddressSnapshot,

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
  async findOrderList(
    userId: string,
    queryDto: QueryOrderDto,
  ): Promise<OrderListResult> {
    const { page = 1, pageSize = 10, orderState = 0 } = queryDto;

    // 先做一次批量过期同步，确保后续状态筛选与分页都是最新状态
    await this.expireUserOrdersIfNeeded(userId);

    /** ================== 1️⃣ 查询订单（分页 + 状态筛选） ================== */
    const qb = this.orderRepository.createQueryBuilder('order');
    qb.where('order.userId = :userId', { userId });
    qb.andWhere('order.isVisible = :isVisible', { isVisible: 1 });
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
    const latestOrders = orders;

    /** ================== 2️⃣ 批量查订单商品（避免 N+1） ================== */
    const orderIds = latestOrders.map((item) => item.id);
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
    const items = latestOrders.map((order) => {
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
      /** 👉 countdown：过期为 -1，未过期为剩余秒数 */
      const countdown = this.calcCountdown(order);
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
  async findOrderDetail(userId: string, orderId: string): Promise<OrderResult> {
    /** ================== 1️⃣ 查询订单主表 ================== */
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId, // 只能查当前用户自己的订单
        isVisible: 1,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const latestOrder = await this.expireOrderIfNeeded(order);

    /** ================== 2️⃣ 查询该订单下的商品 ================== */
    const orderItems = await this.orderItemRepository.find({
      where: {
        orderId: latestOrder.id as any,
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

    /** ================== 4️⃣ countdown：过期为 -1，未过期为剩余秒数 ================== */
    const countdown = this.calcCountdown(latestOrder);

    /** ================== 5️⃣ 格式化下单时间 ================== */
    let createTimeStr = '';
    if (latestOrder.createTime) {
      const d = new Date(latestOrder.createTime);

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
      id: String(latestOrder.id),
      orderState: Number(latestOrder.orderState),
      countdown,
      skus,

      receiverContact: latestOrder.receiverContact ?? '',
      receiverMobile: latestOrder.receiverMobile ?? '',
      receiverAddress: latestOrder.receiverAddress ?? '',

      createTime: createTimeStr,

      totalMoney: Number(latestOrder.totalMoney ?? 0),
      postFee: Number(latestOrder.postFee ?? 0),
      payMoney: Number(latestOrder.payMoney ?? 0),
    };
  }

  /** 确认支付：待付款 -> 待发货 */
  async payOrder(userId: string, orderId: string) {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);

      // 只能操作自己的订单
      const order = await orderRepo.findOne({
        where: {
          id: orderId as any,
          userId,
          isVisible: 1,
        },
      });
      if (!order) {
        throw new NotFoundException('订单不存在');
      }

      // 过期订单在支付入口即时转为已取消，避免把超时单计入销量。
      if (Number(order.orderState) === 1 && this.calcCountdown(order) === -1) {
        await manager
          .createQueryBuilder()
          .update(Order)
          .set({
            orderState: 6 as any,
            cancelReason: '超时未支付',
            cancelTime: new Date() as any,
          })
          .where('id = :id', { id: order.id })
          .andWhere('order_state = :orderState', { orderState: 1 })
          .execute();

        throw new BadRequestException('订单超时未支付，已自动取消');
      }

      // 只有待付款才能确认支付（拦截所有非待付款状态，包含已取消订单）
      if (Number(order.orderState) !== 1) {
        if (Number(order.orderState) === 6) {
          throw new BadRequestException('订单超时未支付，已自动取消');
        }
        throw new BadRequestException('当前订单状态不能确认支付');
      }

      // 用条件更新防止并发重复支付。
      const updateResult = await manager
        .createQueryBuilder()
        .update(Order)
        .set({
          orderState: 2 as any,
          payTime: new Date() as any,
        })
        .where('id = :id', { id: order.id })
        .andWhere('order_state = :orderState', { orderState: 1 })
        .execute();

      if (!updateResult.affected) {
        throw new BadRequestException('当前订单状态不能确认支付');
      }

      // 支付成功后累计 SKU 销量，并同步商品销量（触发器失效时兜底）。
      await this.increaseSkuSalesAfterPayment(order.id, manager);

      return {
        id: String(order.id),
        orderState: 2,
        message: '支付成功',
      };
    });
  }

  /**
   * 支付成功后按订单明细累计 SKU 销量。
   * 说明：商品销量由 SKU 聚合得出，这里额外做一次商品聚合同步作为兜底。
   */
  private async increaseSkuSalesAfterPayment(
    orderId: string,
    manager: EntityManager,
  ) {
    const rows = await manager
      .getRepository(OrderItem)
      .createQueryBuilder('oi')
      .select('oi.sku_id', 'skuId')
      .addSelect('oi.spu_id', 'spuId')
      .addSelect('COALESCE(SUM(oi.quantity), 0)', 'quantity')
      .where('oi.order_id = :orderId', { orderId })
      .groupBy('oi.sku_id')
      .addGroupBy('oi.spu_id')
      .getRawMany<{
        skuId: string;
        spuId: string;
        quantity: string;
      }>();

    if (!rows.length) {
      return;
    }

    const productIds = new Set<string>();

    for (const row of rows) {
      const qty = Number(row.quantity || 0);
      if (qty <= 0) {
        continue;
      }

      await manager
        .createQueryBuilder()
        .update(ProductSku)
        .set({
          salesCount: () => `sales_count + ${qty}`,
        })
        .where('id = :skuId', { skuId: row.skuId })
        .execute();

      productIds.add(row.spuId);
    }

    for (const productId of productIds) {
      await manager.query(
        `
          UPDATE products p
          SET p.sales_count = (
            SELECT COALESCE(SUM(ps.sales_count), 0)
            FROM product_skus ps
            WHERE ps.product_id = p.id
          )
          WHERE p.id = ?
        `,
        [productId],
      );
    }
  }

  /** 手动模拟发货：待发货 -> 待收货 */
  async consignOrder(userId: string, orderId: string) {
    // 只能操作自己的订单
    const order = await this.orderRepository.findOne({
      where: {
        id: orderId as any,
        userId,
        isVisible: 1,
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
        isVisible: 1,
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
        isVisible: 1,
      },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const latestOrder = await this.expireOrderIfNeeded(order);

    // 只有待付款才能取消
    if (Number(latestOrder.orderState) !== 1) {
      throw new BadRequestException('当前订单状态不能取消');
    }
    // 更新状态和取消时间
    latestOrder.orderState = 6 as any;
    latestOrder.cancelTime = new Date() as any;

    await this.orderRepository.save(latestOrder);

    return {
      id: String(latestOrder.id),
      orderState: Number(latestOrder.orderState),
      message: '取消订单成功',
    };
  }

  /** 删除订单（逻辑删除：改为隐藏） */
  async hideOrder(userId: string, orderId: string) {
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({ isVisible: 0 })
      .where('id = :id', { id: orderId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('is_visible = :isVisible', { isVisible: 1 })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('订单不存在');
    }

    return {
      id: String(orderId),
      message: '删除订单成功',
    };
  }
}
