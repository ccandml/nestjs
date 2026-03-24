import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_detail_properties')
export class ProductDetailProperty {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '参数ID',
  })
  id: string;

  @Index('idx_product_id')
  @Column({
    name: 'product_id',
    type: 'bigint',
    unsigned: true,
    comment: '商品ID',
  })
  productId: string;

  @Column({
    name: 'property_name',
    type: 'varchar',
    length: 100,
    comment: '参数名称（如：品牌、材质）',
  })
  propertyName: string;

  @Column({
    name: 'property_value',
    type: 'text',
    comment: '参数值',
  })
  propertyValue: string;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sortOrder: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    comment: '创建时间',
  })
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.detailProperties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
