import { IsInt, Min, Max } from 'class-validator';

/**
 * 管理端修改订单状态 DTO
 * 约束：订单状态只能为 1-6
 * 1: 待付款, 2: 待发货, 3: 待收货, 4: 待评价, 5: 已评价, 6: 已取消
 */
export class AdminUpdateOrderStateDto {
  /**
   * 订单状态值，范围 1-6
   */
  @IsInt({ message: '订单状态必须是整数' })
  @Min(1, { message: '订单状态最小值为 1' })
  @Max(6, { message: '订单状态最大值为 6' })
  orderState: number;
}
