import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '订单ID',
  })
  id: string;

  @Column({
    name: 'order_no',
    type: 'varchar',
    length: 32,
    comment: '订单编号',
  })
  orderNo: string;

  @Index('idx_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    name: 'order_state',
    type: 'tinyint',
    comment: '订单状态，1待付款 2待发货 3待收货 4待评价 5已完成 6已取消',
  })
  orderState: number;

  @Column({
    type: 'int',
    default: -1,
    comment: '倒计时秒数',
  })
  countdown: number;

  @Column({
    name: 'receiver_contact',
    type: 'varchar',
    length: 50,
    comment: '收货人',
  })
  receiverContact: string;

  @Column({
    name: 'receiver_mobile',
    type: 'varchar',
    length: 20,
    comment: '收货人手机',
  })
  receiverMobile: string;

  @Column({
    name: 'receiver_address',
    type: 'varchar',
    length: 255,
    comment: '收货完整地址',
  })
  receiverAddress: string;

  @Column({
    name: 'delivery_time_type',
    type: 'tinyint',
    default: 1,
    comment: '配送时间类型，1不限 2工作日 3双休或假日',
  })
  deliveryTimeType: number;

  @Column({
    name: 'buyer_message',
    type: 'varchar',
    length: 255,
    default: '',
    comment: '订单备注',
  })
  buyerMessage: string;

  @Column({
    name: 'pay_type',
    type: 'tinyint',
    default: 1,
    comment: '支付方式，1在线支付 2货到付款',
  })
  payType: number;

  @Column({
    name: 'pay_channel',
    type: 'tinyint',
    nullable: true,
    default: null,
    comment: '支付渠道，1支付宝 2微信',
  })
  payChannel: number | null;

  @Column({
    name: 'total_money',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '商品总价',
  })
  totalMoney: string;

  @Column({
    name: 'post_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '运费',
  })
  postFee: string;

  @Column({
    name: 'pay_money',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '应付金额',
  })
  payMoney: string;

  @Column({
    name: 'create_time',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    comment: '下单时间',
  })
  createTime: Date;

  @Column({
    name: 'pay_time',
    type: 'datetime',
    nullable: true,
    comment: '支付时间',
  })
  payTime: Date | null;

  @Column({
    name: 'delivery_time',
    type: 'datetime',
    nullable: true,
    comment: '发货时间',
  })
  deliveryTime: Date | null;

  @Column({
    name: 'receive_time',
    type: 'datetime',
    nullable: true,
    comment: '收货时间',
  })
  receiveTime: Date | null;

  @Column({
    name: 'finish_time',
    type: 'datetime',
    nullable: true,
    comment: '完成时间',
  })
  finishTime: Date | null;

  @Column({
    name: 'cancel_time',
    type: 'datetime',
    nullable: true,
    comment: '取消时间',
  })
  cancelTime: Date | null;

  @Column({
    name: 'cancel_reason',
    type: 'varchar',
    length: 255,
    default: '',
    comment: '取消原因',
  })
  cancelReason: string;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    comment: '更新时间',
  })
  updatedAt: Date;
}
