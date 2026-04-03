import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建 SKU 销量同步触发器
 * 保证 Product.salesCount 始终等于其所有 SKU 销量之和
 */
export class SyncProductSalesTrigger1775700000000 implements MigrationInterface {
  name = 'SyncProductSalesTrigger1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 先全量修复一次，避免历史数据漂移。
    await queryRunner.query(`
      UPDATE products p
      SET sales_count = (
        SELECT COALESCE(SUM(ps.sales_count), 0)
        FROM product_skus ps
        WHERE ps.product_id = p.id
      )
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_insert_sync_sales
      AFTER INSERT ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET sales_count = (
          SELECT COALESCE(SUM(ps.sales_count), 0)
          FROM product_skus ps
          WHERE ps.product_id = NEW.product_id
        )
        WHERE id = NEW.product_id;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_update_sync_sales
      AFTER UPDATE ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET sales_count = (
          SELECT COALESCE(SUM(ps.sales_count), 0)
          FROM product_skus ps
          WHERE ps.product_id = NEW.product_id
        )
        WHERE id = NEW.product_id;

        IF NEW.product_id <> OLD.product_id THEN
          UPDATE products
          SET sales_count = (
            SELECT COALESCE(SUM(ps.sales_count), 0)
            FROM product_skus ps
            WHERE ps.product_id = OLD.product_id
          )
          WHERE id = OLD.product_id;
        END IF;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_delete_sync_sales
      AFTER DELETE ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET sales_count = (
          SELECT COALESCE(SUM(ps.sales_count), 0)
          FROM product_skus ps
          WHERE ps.product_id = OLD.product_id
        )
        WHERE id = OLD.product_id;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_insert_sync_sales`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_update_sync_sales`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_delete_sync_sales`,
    );
  }
}
