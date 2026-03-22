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

@Entity('product_main_images')
export class ProductMainImage {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '主图ID',
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
    name: 'image_url',
    type: 'varchar',
    length: 255,
    comment: '图片地址',
  })
  imageUrl: string;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: '排序值（控制轮播顺序）',
  })
  sortOrder: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    comment: '创建时间',
  })
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.mainImages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
