import { MigrationInterface, QueryRunner, Table } from 'typeorm';

/**
 * 创建公告表（单条配置）
 */
export class CreateNoticeTable1776000000000 implements MigrationInterface {
  name = 'CreateNoticeTable1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notice',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            unsigned: true,
            isPrimary: true,
            comment: '公告ID（固定为1）',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
            comment: '公告内容',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notice');
  }
}
