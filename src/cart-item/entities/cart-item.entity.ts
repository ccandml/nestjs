import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('cart_items')
@Unique('uk_user_sku', ['userId', 'skuId'])
export class CartItem {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '购物车项ID',
  })
  id: string;

  @Index('idx_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
    comment: '商品ID',
  })
  productId: string;

  @Column({
    name: 'sku_id',
    type: 'bigint',
    unsigned: true,
    comment: 'SKU ID',
  })
  skuId: string;

  @Column({
    type: 'int',
    unsigned: true,
    default: 1,
    comment: '购买数量',
  })
  quantity: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否选中',
  })
  selected: boolean;

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
