import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ProductSku } from './product-skus.entity';
import { ProductSpecValue } from './product-spec-values.entity';
import { ProductSpec } from './product-specs.entity';

@Entity('product_sku_specs')
@Unique('uk_sku_spec_value', ['skuId', 'specId', 'specValueId'])
export class ProductSkuSpec {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: 'SKU规格组合ID',
  })
  id: string;

  @Index('idx_sku_id')
  @Column({
    name: 'sku_id',
    type: 'bigint',
    unsigned: true,
    comment: 'SKU ID',
  })
  skuId: string;

  @Column({
    name: 'spec_id',
    type: 'bigint',
    unsigned: true,
    comment: '规格ID',
  })
  specId: string;

  @Column({
    name: 'spec_value_id',
    type: 'bigint',
    unsigned: true,
    comment: '规格值ID',
  })
  specValueId: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    comment: '创建时间',
  })
  createdAt: Date;

  @ManyToOne(() => ProductSku, (sku) => sku.skuSpecs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sku_id' })
  sku: ProductSku;

  @ManyToOne(() => ProductSpec, (spec) => spec.skuSpecs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'spec_id' })
  spec: ProductSpec;

  @ManyToOne(() => ProductSpecValue, (specValue) => specValue.skuSpecs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'spec_value_id' })
  specValue: ProductSpecValue;
}
