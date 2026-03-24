const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PRODUCTS_DIR = path.join(ROOT, 'products');
const OUTPUT_FILE = path.join(ROOT, 'products-seed.sql');

const FILE_MAP = [
  {
    json: 'Category.json',
    table: 'categories',
    columns: [
      'id',
      'name',
      'parent_id',
      'level',
      'sort_order',
      'icon',
      'is_visible',
      'created_at',
      'updated_at',
    ],
    pick: (row) => [
      row.id,
      row.name,
      row.parentId,
      row.level,
      row.sortOrder,
      row.icon,
      row.isVisible,
      row.createdAt,
      row.updatedAt,
    ],
  },
  {
    json: 'Product.json',
    table: 'products',
    columns: [
      'id',
      'category_id',
      'name',
      'subtitle',
      'spu_code',
      'brand',
      'main_image',
      'price',
      'original_price',
      'total_stock',
      'sales_count',
      'status',
      'description',
      'created_at',
      'updated_at',
    ],
    pick: (row) => [
      row.id,
      row.categoryId,
      row.name,
      row.subtitle,
      row.spuCode,
      row.brand,
      row.mainImage,
      row.price,
      row.originalPrice,
      row.totalStock,
      row.salesCount,
      row.status,
      row.description,
      row.createdAt,
      row.updatedAt,
    ],
  },
  {
    json: 'ProductMainImage.json',
    table: 'product_main_images',
    columns: ['id', 'product_id', 'image_url', 'sort_order', 'created_at'],
    pick: (row) => [
      row.id,
      row.productId,
      row.imageUrl,
      row.sortOrder,
      row.createdAt,
    ],
  },
  {
    json: 'ProductDetailImage.json',
    table: 'product_detail_images',
    columns: ['id', 'product_id', 'image_url', 'sort_order', 'created_at'],
    pick: (row) => [
      row.id,
      row.productId,
      row.imageUrl,
      row.sortOrder,
      row.createdAt,
    ],
  },
  {
    json: 'ProductDetailProperty.json',
    table: 'product_detail_properties',
    columns: [
      'id',
      'product_id',
      'property_name',
      'property_value',
      'sort_order',
      'created_at',
    ],
    pick: (row) => [
      row.id,
      row.productId,
      row.propertyName,
      row.propertyValue,
      row.sortOrder,
      row.createdAt,
    ],
  },
  {
    json: 'ProductSpec.json',
    table: 'product_specs',
    columns: ['id', 'product_id', 'spec_name', 'sort_order', 'created_at'],
    pick: (row) => [
      row.id,
      row.productId,
      row.specName,
      row.sortOrder,
      row.createdAt,
    ],
  },
  {
    json: 'ProductSpecValue.json',
    table: 'product_spec_values',
    columns: ['id', 'spec_id', 'value_name', 'sort_order', 'created_at'],
    pick: (row) => [
      row.id,
      row.specId,
      row.valueName,
      row.sortOrder,
      row.createdAt,
    ],
  },
  {
    json: 'ProductSku.json',
    table: 'product_skus',
    columns: [
      'id',
      'product_id',
      'sku_code',
      'image_url',
      'price',
      'original_price',
      'stock',
      'sales_count',
      'status',
      'created_at',
      'updated_at',
    ],
    pick: (row) => [
      row.id,
      row.productId,
      row.skuCode,
      row.imageUrl,
      row.price,
      row.originalPrice,
      row.stock,
      row.salesCount,
      row.status,
      row.createdAt,
      row.updatedAt,
    ],
  },
  {
    json: 'ProductSkuSpec.json',
    table: 'product_sku_specs',
    columns: ['id', 'sku_id', 'spec_id', 'spec_value_id', 'created_at'],
    pick: (row) => [
      row.id,
      row.skuId,
      row.specId,
      row.specValueId,
      row.createdAt,
    ],
  },
];

function fmtDate(v) {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  );
}

function toSqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) return `'${fmtDate(v)}'`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';

  let s = String(v);
  const dateLike = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  if (dateLike.test(s)) {
    s = fmtDate(s);
  }

  s = s
    .replace(/\\/g, '\\\\')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/'/g, "''");

  return `'${s}'`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function readJsonArray(fileName) {
  const full = path.join(PRODUCTS_DIR, fileName);
  const raw = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

function buildInsert(table, columns, rows, batchSize = 500) {
  if (!rows.length) return '';
  const cols = columns.map((c) => `\`${c}\``).join(', ');
  const parts = [];
  const batches = chunk(rows, batchSize);

  for (const b of batches) {
    const values = b
      .map((r) => `(${r.map((x) => toSqlValue(x)).join(', ')})`)
      .join(',\n');
    parts.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n${values};`);
  }

  return parts.join('\n\n');
}

function dedupeRowsById(table, columns, rows) {
  const idIndex = columns.indexOf('id');
  if (idIndex === -1) {
    return {
      rows,
      removed: 0,
    };
  }

  const seen = new Set();
  const deduped = [];
  let removed = 0;

  for (const row of rows) {
    const idValue = row[idIndex];
    const key = String(idValue);
    if (seen.has(key)) {
      removed += 1;
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }

  if (removed > 0) {
    console.warn(
      `[seed] table=${table} removed_duplicate_ids=${removed} kept=${deduped.length}`,
    );
  }

  return {
    rows: deduped,
    removed,
  };
}

function main() {
  const sections = [];
  sections.push(
    '-- Auto-generated from products/*.json by scripts/generate-products-seed-sql.js',
  );
  sections.push('SET NAMES utf8mb4;');
  sections.push('SET FOREIGN_KEY_CHECKS = 0;');

  for (const item of FILE_MAP) {
    const data = readJsonArray(item.json);
    const rawRows = data.map((row) => item.pick(row));
    const { rows } = dedupeRowsById(item.table, item.columns, rawRows);
    sections.push(`\n-- ${item.table} (${rows.length} rows)`);
    sections.push(buildInsert(item.table, item.columns, rows));
  }

  sections.push('\nSET FOREIGN_KEY_CHECKS = 1;');
  fs.writeFileSync(OUTPUT_FILE, sections.join('\n'), 'utf8');
  console.log(`Generated ${OUTPUT_FILE}`);
}

main();
