import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('notice')
export class Notice {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
    comment: '公告ID（固定为1）',
  })
  id: string;

  @Column({
    type: 'text',
    comment: '公告内容',
  })
  content: string;
}
