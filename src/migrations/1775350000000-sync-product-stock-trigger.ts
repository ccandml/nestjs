import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建 SKU 库存同步触发器
 * 保证 Product.totalStock 始终等于其所有 SKU 库存之和
 * 触发时机：SKU 的 stock 字段变化时自动更新商品的 totalStock
 */
export class SyncProductStockTrigger1775350000000 implements MigrationInterface {
  name = 'SyncProductStockTrigger1775350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 首先重算所有商品的总库存（数据修复）
    await queryRunner.query(`
      UPDATE products p
      SET total_stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM product_skus ps
        WHERE ps.product_id = p.id
      )
    `);

    // 1.1 重算所有商品价格为其 SKU 最低价（无 SKU 时回落为 0）
    await queryRunner.query(`
      UPDATE products p
      SET price = (
        SELECT COALESCE(MIN(ps.price), 0)
        FROM product_skus ps
        WHERE ps.product_id = p.id
      )
    `);

    // 2. 创建触发器：SKU 插入时更新商品总库存
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_insert_sync_stock
      AFTER INSERT ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET total_stock = total_stock + NEW.stock,
            price = (
              SELECT COALESCE(MIN(ps.price), 0)
              FROM product_skus ps
              WHERE ps.product_id = NEW.product_id
            )
        WHERE id = NEW.product_id;
      END
    `);

    // 3. 创建触发器：SKU 更新时同步库存变化
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_update_sync_stock
      AFTER UPDATE ON product_skus
      FOR EACH ROW
      BEGIN
        -- 库存差值 = 新库存 - 旧库存
        UPDATE products
        SET total_stock = total_stock + (NEW.stock - OLD.stock),
            price = (
              SELECT COALESCE(MIN(ps.price), 0)
              FROM product_skus ps
              WHERE ps.product_id = NEW.product_id
            )
        WHERE id = NEW.product_id;
      END
    `);

    // 4. 创建触发器：SKU 删除时更新商品总库存
    await queryRunner.query(`
      CREATE TRIGGER trg_product_sku_delete_sync_stock
      AFTER DELETE ON product_skus
      FOR EACH ROW
      BEGIN
        UPDATE products
        SET total_stock = total_stock - OLD.stock,
            price = (
              SELECT COALESCE(MIN(ps.price), 0)
              FROM product_skus ps
              WHERE ps.product_id = OLD.product_id
            )
        WHERE id = OLD.product_id;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除触发器
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_insert_sync_stock`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_update_sync_stock`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_product_sku_delete_sync_stock`,
    );
  }
}
