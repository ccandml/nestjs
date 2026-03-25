import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('recommend')
export class Recommend {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    comment: '推荐模块ID',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '标题',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '副标题',
  })
  alt: string;

  @Column({
    type: 'int',
    comment: '类型',
  })
  type: number;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Banner图片',
  })
  bannerPicture: string;

  @Column({
    type: 'json',
    comment: '子分类（数组）',
  })
  subTypes: string[];
}
