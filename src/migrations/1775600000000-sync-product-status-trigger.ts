import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建 SKU 状态同步触发器
 * 保证 Product.status 始终由 SKU 状态聚合得到：
 * 存在任一 status=1 的 SKU => 商品 status=1；否则 status=0
 */
export class SyncProductStatusTrigger1775600000000 implements MigrationInterface {
  name = 'SyncProductStatusTrigger1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 先做一次全量修复，避免历史数据中 product.status 与 SKU 状态不一致。
    await queryRunner.query(`
      UPDATE products p
      SET status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM product_skus ps
          WHERE ps.product_id = p.id AND ps.status = 1
        ) THEN 1
        ELSE 0
      END
    `);

    // SKU 新增时，重算对应商品 status。
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_insert_sync_status
      AFTER INSERT ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET status = CASE
          WHEN EXISTS (
            SELECT 1
            FROM product_skus ps
            WHERE ps.product_id = NEW.product_id AND ps.status = 1
          ) THEN 1
          ELSE 0
        END
        WHERE id = NEW.product_id;
      END
    `);

    // SKU 更新时，同时处理 status 变化以及 product_id 迁移场景。
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_update_sync_status
      AFTER UPDATE ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET status = CASE
          WHEN EXISTS (
            SELECT 1
            FROM product_skus ps
            WHERE ps.product_id = NEW.product_id AND ps.status = 1
          ) THEN 1
          ELSE 0
        END
        WHERE id = NEW.product_id;

        IF NEW.product_id <> OLD.product_id THEN
          UPDATE products
          SET status = CASE
            WHEN EXISTS (
              SELECT 1
              FROM product_skus ps
              WHERE ps.product_id = OLD.product_id AND ps.status = 1
            ) THEN 1
            ELSE 0
          END
          WHERE id = OLD.product_id;
        END IF;
      END
    `);

    // SKU 删除时，重算对应商品 status。
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_delete_sync_status
      AFTER DELETE ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET status = CASE
          WHEN EXISTS (
            SELECT 1
            FROM product_skus ps
            WHERE ps.product_id = OLD.product_id AND ps.status = 1
          ) THEN 1
          ELSE 0
        END
        WHERE id = OLD.product_id;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_insert_sync_status`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_update_sync_status`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_delete_sync_status`,
    );
  }
}
