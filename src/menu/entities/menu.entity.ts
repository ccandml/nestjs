import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Menus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  path: string;

  @Column()
  order: string;

  @Column()
  limit: string;
}
