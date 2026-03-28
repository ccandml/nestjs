import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderVisible1775011200000 implements MigrationInterface {
  name = 'AddOrderVisible1775011200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `orders` ADD `is_visible` tinyint NOT NULL DEFAULT 1 COMMENT '是否展示，1展示 0隐藏'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `orders` DROP COLUMN `is_visible`');
  }
}
