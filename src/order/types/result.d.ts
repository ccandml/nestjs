/** 商品信息 */
export type OrderSkuItem = {
  /** sku id */
  id: string;
  /** 商品 id */
  spuId: string;
  /** 商品名称 */
  name: string;
  /** 商品属性文字 */
  attrsText: string;
  /** 数量 */
  quantity: number;
  /** 购买时单价 */
  curPrice: number;
  /** 图片地址 */
  image: string;
};

/** 订单预览信息 */
export type OrderPreGoods = {
  /** 属性文字，例如“颜色:瓷白色 尺寸：8寸” */
  attrsText: string;
  /** 数量 */
  count: number;
  /** 商品id */
  spuId: string;
  /** 商品名称 */
  name: string;
  /** 实付单价 */
  payPrice: string;
  /** 图片 */
  picture: string;
  /** 原单价 */
  price: string;
  /** SKUID */
  skuId: string;
  /** 小计总价 */
  totalPrice: string;
};

/** 订单详情 返回信息 */
export type OrderResult = {
  /** 订单编号 */
  id: string;
  /** 订单状态，1为待付款、2为待发货、3为待收货、4为待评价、5为已完成、6为已取消 */
  orderState: number;
  /** 倒计时--剩余的秒数 -1 表示已经超时，正数表示倒计时未结束 */
  countdown: number;
  /** 商品集合 [ 商品信息 ] */
  skus: OrderSkuItem[];
  /** 收货人 */
  receiverContact: string;
  /** 收货人手机 */
  receiverMobile: string;
  /** 收货人完整地址 */
  receiverAddress: string;
  /** 下单时间 */
  createTime: string;
  /** 商品总价 */
  totalMoney: number;
  /** 运费 */
  postFee: number;
  /** 应付金额 */
  payMoney: number;
};

/** 订单列表 */
export type OrderListResult = {
  /** 总记录数 */
  counts: number;
  /** 数据集合    [ 订单信息 ] */
  items: OrderItem[];
  /** 当前页码 */
  page: number;
  /** 总页数 */
  pages: number;
  /** 页尺寸 */
  pageSize: number;
};
/** 订单列表项 */
export type OrderItem = OrderResult & {
  /** 总件数 */
  totalNum: number;
};

/** 物流日志 */
export type LogisticItem = {
  /** 信息ID */
  id: string;
  /** 信息文字 */
  text: string;
};

/** 管理端订单列表项 */
export type AdminOrderListItem = {
  /** 订单id */
  id: string;
  /** 用户头像 */
  userAvatar: string;
  /** 用户名 */
  username: string;
  /** 商品总付价 */
  totalPayPrice: number;
  /** 创建时间 */
  createTime: string;
  /** 订单状态 */
  orderState: number;
};

/** 管理端订单列表 */
export type AdminOrderListResult = {
  /** 总记录数 */
  counts: number;
  /** 当前页码 */
  page: number;
  /** 页尺寸 */
  pageSize: number;
  /** 总页数 */
  pages: number;
  /** 列表数据 */
  items: AdminOrderListItem[];
};

/** 管理端订单详情中的 SKU 项 */
export type AdminOrderDetailSkuItem = {
  /** SKU ID */
  skuId: string;
  /** 商品图片快照 */
  picture: string;
  /** 商品名称快照 */
  name: string;
  /** 商品属性文字快照 */
  attrsText: string;
  /** 购买时单价 */
  payPrice: number;
  /** 商品数量 */
  quantity: number;
  /** 小计金额 */
  totalPayPrice: number;
};

/** 管理端订单详情 */
export type AdminOrderDetailResult = {
  /** 订单id */
  id: string;
  /** 用户名 */
  username: string;
  /** 订单状态 */
  orderState: number;
  /** 创建时间 */
  createTime: string;
  /** 收货人 */
  receiverContact: string;
  /** 收货人手机 */
  receiverMobile: string;
  /** 收货完整地址（省市区 + 详细地址） */
  receiverAddress: string;
  /** 运费 */
  postFee: number;
  /** 实付价格总计 */
  payMoney: number;
  /** 商品 SKU 列表 */
  skus: AdminOrderDetailSkuItem[];
};
