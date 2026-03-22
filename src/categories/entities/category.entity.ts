import { Product } from 'src/products/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '分类ID',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '分类名称',
  })
  name: string;

  @Index('idx_parent_id')
  @Column({
    name: 'parent_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: '父分类ID（0表示一级分类）',
  })
  parentId: string;

  @Column({
    type: 'tinyint',
    unsigned: true,
    comment: '分类层级：1一级，2二级',
  })
  level: number;

  @Column({
    name: 'sort_order',
    type: 'int',
    default: 0,
    comment: '排序值（越小越靠前）',
  })
  sortOrder: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '分类图标',
  })
  icon: string | null;

  @Column({
    name: 'is_visible',
    type: 'tinyint',
    width: 1,
    default: () => '1',
    comment: '是否显示：1显示，0隐藏',
  })
  isVisible: number;

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

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
