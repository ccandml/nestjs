import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('category_nav')
export class CategoryNav {
  @PrimaryColumn({
    type: 'bigint',
    comment: '分类ID',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '分类名称',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '分类图标',
  })
  icon: string;
}
