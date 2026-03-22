import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '订单商品项ID',
  })
  id: string;

  @Index('idx_order_id')
  @Column({
    name: 'order_id',
    type: 'bigint',
    unsigned: true,
    comment: '订单ID',
  })
  orderId: string;

  @Index('idx_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    name: 'spu_id',
    type: 'bigint',
    unsigned: true,
    comment: '商品ID',
  })
  spuId: string;

  @Column({
    name: 'sku_id',
    type: 'bigint',
    unsigned: true,
    comment: 'SKU ID',
  })
  skuId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '商品名称快照',
  })
  name: string;

  @Column({
    name: 'attrs_text',
    type: 'varchar',
    length: 255,
    default: '',
    comment: '商品属性文字快照',
  })
  attrsText: string;

  @Column({
    type: 'varchar',
    length: 255,
    default: '',
    comment: '商品图片快照',
  })
  picture: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '购买时原单价',
  })
  price: string;

  @Column({
    name: 'pay_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '购买时实付单价',
  })
  payPrice: string;

  @Column({
    type: 'int',
    unsigned: true,
    default: 1,
    comment: '购买数量',
  })
  quantity: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '小计总价',
  })
  totalPrice: string;

  @Column({
    name: 'total_pay_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '实付价格小计',
  })
  totalPayPrice: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

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
