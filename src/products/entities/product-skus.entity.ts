import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ProductSkuSpec } from './product-sku-specs.entity';
import { Product } from './product.entity';

@Entity('product_skus')
@Unique('uk_sku_code', ['skuCode'])
export class ProductSku {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: 'SKU ID',
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
    name: 'sku_code',
    type: 'varchar',
    length: 64,
    comment: 'SKU编码（唯一）',
  })
  skuCode: string;

  @Column({
    name: 'image_url',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'SKU图片（可随规格变化）',
  })
  imageUrl: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '销售价',
  })
  price: string;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '划线价',
  })
  originalPrice: string;

  @Column({
    type: 'int',
    default: 0,
    comment: '库存数量',
  })
  stock: number;

  @Column({
    name: 'sales_count',
    type: 'int',
    default: 0,
    comment: '销量',
  })
  salesCount: number;

  @Index('idx_status')
  @Column({
    type: 'tinyint',
    default: 1,
    comment: '状态：1启用，0禁用',
  })
  status: number;

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

  @ManyToOne(() => Product, (product) => product.skus, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductSkuSpec, (item) => item.sku)
  skuSpecs: ProductSkuSpec[];
}
