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
import { ProductSpec } from './product-specs.entity';

@Entity('product_spec_values')
export class ProductSpecValue {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '规格值ID',
  })
  id: string;

  @Index('idx_spec_id')
  @Column({
    name: 'spec_id',
    type: 'bigint',
    unsigned: true,
    comment: '规格ID',
  })
  specId: string;

  @Column({
    name: 'value_name',
    type: 'varchar',
    length: 100,
    comment: '规格值（如：黑色、XL）',
  })
  valueName: string;

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

  @ManyToOne(() => ProductSpec, (spec) => spec.values, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'spec_id' })
  spec: ProductSpec;

  @OneToMany(() => ProductSkuSpec, (item) => item.specValue)
  skuSpecs: ProductSkuSpec[];
}
