/** 最近30日每日销售统计项 */
export interface StatisticsDailySalesItem {
  /** 日期，格式 YYYY-MM-DD */
  date: string;
  /** 每日销售额（元） */
  salesAmount: number;
  /** 每日订单数 */
  orderCount: number;
}

/** 最近30日每日销售统计返回结构 */
export interface StatisticsDailySalesResult {
  /** 每日统计列表 */
  items: StatisticsDailySalesItem[];
}

/** 汇总统计返回结构（当前月份、今日共用） */
export interface StatisticsSummaryResult {
  /** 订单数 */
  orderCount: number;
  /** 销售额（元） */
  salesAmount: number;
  /** 新增用户数 */
  newUsers: number;
}
