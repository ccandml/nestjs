import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 添加微信小程序字段
 * 添加 openid 字段用于微信小程序用户登录
 */
export class AddUserOpenid1775800000000 implements MigrationInterface {
  name = 'AddUserOpenid1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 openid 列：唯一、允许为空
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'openid',
        type: 'varchar',
        length: '128',
        isNullable: true,
        isUnique: true,
        comment: '微信小程序用户唯一标识',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：删除 openid 列
    await queryRunner.dropColumn('user', 'openid');
  }
}
