import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductSkuSpec } from './product-sku-specs.entity';
import { ProductSpecValue } from './product-spec-values.entity';
import { Product } from './product.entity';

@Entity('product_specs')
export class ProductSpec {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '规格ID',
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
    name: 'spec_name',
    type: 'varchar',
    length: 100,
    comment: '规格名称（如：颜色、尺码）',
  })
  specName: string;

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

  @ManyToOne(() => Product, (product) => product.specs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ProductSpecValue, (value) => value.spec)
  values: ProductSpecValue[];

  @OneToMany(() => ProductSkuSpec, (item) => item.spec)
  skuSpecs: ProductSkuSpec[];
}
