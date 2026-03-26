import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('city_codes')
export class CityCode {
  @PrimaryColumn({
    type: 'varchar',
    length: 9,
    comment: '行政区划编码',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '地区名称',
  })
  name: string;

  @Index('idx_city_codes_parent_code')
  @Column({
    name: 'parent_code',
    type: 'varchar',
    length: 9,
    nullable: true,
    comment: '父级编码',
  })
  parentCode: string | null;

  @Index('idx_city_codes_level')
  @Column({
    type: 'tinyint',
    unsigned: true,
    comment: '层级：1省 2市 3区/县',
  })
  level: number;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 100,
    comment: '完整地区名称',
  })
  fullName: string;

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
}
