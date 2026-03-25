import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    comment: '轮播图ID',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '图片地址',
  })
  imgUrl: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '跳转地址或关联ID',
  })
  hrefUrl: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '轮播图类型',
  })
  type: string;
}
