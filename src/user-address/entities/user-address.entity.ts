import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
    comment: '收货地址ID',
  })
  id: string;

  @Index('idx_user_id')
  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '收货人姓名',
  })
  receiver: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: '联系方式',
  })
  contact: string;

  @Column({
    name: 'province_code',
    type: 'varchar',
    length: 20,
    comment: '省份编码',
  })
  provinceCode: string;

  @Column({
    name: 'city_code',
    type: 'varchar',
    length: 20,
    comment: '城市编码',
  })
  cityCode: string;

  @Column({
    name: 'county_code',
    type: 'varchar',
    length: 20,
    comment: '区/县编码',
  })
  countyCode: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: '详细地址',
  })
  address: string;

  @Column({
    name: 'is_default',
    type: 'tinyint',
    default: 0,
    comment: '默认地址，1为是，0为否',
  })
  isDefault: number;

  @Column({
    name: 'full_location',
    type: 'varchar',
    length: 100,
    comment: '省市区',
  })
  fullLocation: string;

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
