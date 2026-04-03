import { Gender } from '../entities/user.entity';

/** 个人信息 用户详情信息 */
export type ProfileDetail = {
  /** 用户ID */
  id: number;
  /** 昵称 */
  username: string;
  /** 性别 */
  gender?: Gender;
  /** 生日 */
  birthday?: string;
  /** 头像  */
  avatar: string;
  /** 省市区 */
  fullLocation?: string;
  /** 职业 */
  profession?: string;
};

/** 管理端用户列表项 */
export type AdminUserListItem = {
  /** 用户ID */
  id: number;
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 性别 */
  gender: string;
  /** 注册时间 */
  createTime: string;
  /** 用户角色 */
  roleNames: string[];
  /** 订单数 */
  orderCount: number;
  /** 总消费金额 */
  totalPayMoney: number;
};

/** 管理端用户列表 */
export type AdminUserListResult = {
  /** 总记录数 */
  counts: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  pages: number;
  /** 列表 */
  items: AdminUserListItem[];
};

/** 管理端用户详情-基础信息 */
export type AdminUserDetailProfile = {
  /** 用户ID */
  id: number;
  /** 头像 */
  avatar: string;
  /** 用户名 */
  username: string;
  /** 性别 */
  gender: string;
  /** 注册时间 */
  createTime: string;
  /** 用户角色 */
  roleNames: string[];
};

/** 管理端用户详情-统计信息 */
export type AdminUserDetailStats = {
  /** 订单总数 */
  orderCount: number;
  /** 累计消费金额 */
  totalPayMoney: number;
  /** 最近下单时间 */
  latestOrderTime: string;
};

/** 管理端用户详情-收货地址项 */
export type AdminUserDetailAddressItem = {
  /** 收货人 */
  receiver: string;
  /** 手机号 */
  mobile: string;
  /** 完整地址（省市区 + 详细地址） */
  fullAddress: string;
  /** 是否默认地址 */
  isDefault: boolean;
};

/** 管理端用户详情-最近订单项 */
export type AdminUserDetailOrderItem = {
  /** 订单ID */
  id: string;
  /** 下单时间 */
  createTime: string;
  /** 订单金额 */
  payMoney: number;
  /** 订单状态 */
  orderState: number;
};

/** 管理端用户详情 */
export type AdminUserDetailResult = {
  /** 用户基础信息 */
  profile: AdminUserDetailProfile;
  /** 统计信息 */
  stats: AdminUserDetailStats;
  /** 收货地址列表 */
  addresses: AdminUserDetailAddressItem[];
  /** 最近订单列表 */
  recentOrders: AdminUserDetailOrderItem[];
};
