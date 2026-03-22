import { Category } from 'src/categories/entities/category.entity';
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
import { ProductDetailImage } from './product-detail-images.entity';
import { ProductDetailProperty } from './product-detail-properties.entity';
import { ProductMainImage } from './product-main-images.entity';
import { ProductSku } from './product-skus.entity';
import { ProductSpec } from './product-specs.entity';

@Entity('products')
@Unique('uk_spu_code', ['spuCode'])
export class Product {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '商品ID',
  })
  id: string;

  @Index('idx_category_id')
  @Column({
    name: 'category_id',
    type: 'bigint',
    unsigned: true,
    comment: '所属分类ID（一般为二级分类）',
  })
  categoryId: string;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '商品名称',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '商品副标题',
  })
  subtitle: string | null;

  @Column({
    name: 'spu_code',
    type: 'varchar',
    length: 64,
    comment: 'SPU编码（唯一标识商品）',
  })
  spuCode: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '品牌名称',
  })
  brand: string | null;

  @Column({
    name: 'main_image',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '商品封面主图',
  })
  mainImage: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '默认展示价（最低价）',
  })
  price: string;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '划线价/原价',
  })
  originalPrice: string;

  @Column({
    name: 'total_stock',
    type: 'int',
    default: 0,
    comment: '商品总库存（可由SKU汇总）',
  })
  totalStock: number;

  @Column({
    name: 'sales_count',
    type: 'int',
    default: 0,
    comment: '商品总销量',
  })
  salesCount: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '商品状态：1上架，0下架',
  })
  status: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '商品描述',
  })
  description: string | null;

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

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductMainImage, (item) => item.product)
  mainImages: ProductMainImage[];

  @OneToMany(() => ProductDetailImage, (item) => item.product)
  detailImages: ProductDetailImage[];

  @OneToMany(() => ProductDetailProperty, (item) => item.product)
  detailProperties: ProductDetailProperty[];

  @OneToMany(() => ProductSpec, (item) => item.product)
  specs: ProductSpec[];

  @OneToMany(() => ProductSku, (item) => item.product)
  skus: ProductSku[];
}
