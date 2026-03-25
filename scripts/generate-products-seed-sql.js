const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GOODS_FILE = path.join(ROOT, 'goodsDetailsByGuessLike.json');
const OUTPUT_FILE = path.join(ROOT, 'products-seed.sql');

const TABLES = {
  categories: {
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
  },
  products: {
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
  },
  productMainImages: {
    table: 'product_main_images',
    columns: ['id', 'product_id', 'image_url', 'sort_order', 'created_at'],
  },
  productDetailImages: {
    table: 'product_detail_images',
    columns: ['id', 'product_id', 'image_url', 'sort_order', 'created_at'],
  },
  productDetailProperties: {
    table: 'product_detail_properties',
    columns: [
      'id',
      'product_id',
      'property_name',
      'property_value',
      'sort_order',
      'created_at',
    ],
  },
  productSpecs: {
    table: 'product_specs',
    columns: ['id', 'product_id', 'spec_name', 'sort_order', 'created_at'],
  },
  productSpecValues: {
    table: 'product_spec_values',
    columns: ['id', 'spec_id', 'value_name', 'sort_order', 'created_at'],
  },
  productSkus: {
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
  },
  productSkuSpecs: {
    table: 'product_sku_specs',
    columns: ['id', 'sku_id', 'spec_id', 'spec_value_id', 'created_at'],
  },
};

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

function readGoodsArray() {
  const raw = fs.readFileSync(GOODS_FILE, 'utf8');
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

function numId(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return String(Math.trunc(n));
}

function createIdFactory(start = 800000000000000) {
  let cursor = Number(start);
  return () => {
    cursor += 1;
    return String(cursor);
  };
}

function uniqueCode(raw, used, fallbackPrefix, fallbackId) {
  let base = String(raw || '').trim();
  if (!base) base = `${fallbackPrefix}${fallbackId}`;
  let next = base;
  let suffix = 1;
  while (used.has(next)) {
    suffix += 1;
    next = `${base}-${suffix}`;
  }
  used.add(next);
  return next;
}

function normalizeRows() {
  const goods = readGoodsArray();
  const now = fmtDate(new Date());
  const nextRelId = createIdFactory();

  const categories = [];
  const products = [];
  const productMainImages = [];
  const productDetailImages = [];
  const productDetailProperties = [];
  const productSpecs = [];
  const productSpecValues = [];
  const productSkus = [];
  const productSkuSpecs = [];

  const categoryMap = new Map();
  const productIdSet = new Set();
  const skuCodeSet = new Set();
  const spuCodeSet = new Set();
  const productHasSku = new Set();
  const productHasSkuSpec = new Set();

  let syntheticCategoryId = 900000000000000;

  for (const raw of goods) {
    const detail = raw && raw.detail ? raw.detail : raw;
    if (!detail || !detail.id) continue;

    const productId = String(detail.id);
    if (productIdSet.has(productId)) {
      continue;
    }
    productIdSet.add(productId);

    const rawCategories = Array.isArray(detail.categories) ? detail.categories : [];
    for (const c of rawCategories) {
      if (!c || !c.id) continue;
      const id = String(c.id);
      if (!categoryMap.has(id)) {
        const parentId = c.parent && c.parent.id ? String(c.parent.id) : '0';
        const level = Number(c.layer) || 1;
        const row = [
          id,
          String(c.name || `分类${id}`),
          parentId,
          level,
          0,
          null,
          1,
          now,
          now,
        ];
        categoryMap.set(id, row);
        categories.push(row);
      }

      if (c.parent && c.parent.id) {
        const pId = String(c.parent.id);
        if (!categoryMap.has(pId)) {
          const pRow = [
            pId,
            String(c.parent.name || `分类${pId}`),
            '0',
            Number(c.parent.layer) || 1,
            0,
            null,
            1,
            now,
            now,
          ];
          categoryMap.set(pId, pRow);
          categories.push(pRow);
        }
      }
    }

    let categoryId = null;
    const secondLevel = rawCategories.find((c) => Number(c && c.layer) === 2);
    const firstAny = rawCategories.find((c) => c && c.id);
    if (secondLevel && secondLevel.id) {
      categoryId = String(secondLevel.id);
    } else if (firstAny && firstAny.id) {
      categoryId = String(firstAny.id);
    }
    if (!categoryId) {
      syntheticCategoryId += 1;
      categoryId = String(syntheticCategoryId);
      if (!categoryMap.has(categoryId)) {
        const fallback = [
          categoryId,
          '未分类',
          '0',
          1,
          0,
          null,
          1,
          now,
          now,
        ];
        categoryMap.set(categoryId, fallback);
        categories.push(fallback);
      }
    }

    const spuCode = uniqueCode(detail.spuCode || detail.id, spuCodeSet, 'SPU-', productId);
    const productName = String(detail.name || `商品${productId}`).slice(0, 200);
    const description = detail.desc == null ? '' : String(detail.desc);
    const productPrice = String(detail.price == null ? '0.00' : detail.price);
    const productOldPrice = String(detail.oldPrice == null ? productPrice : detail.oldPrice);
    const salesCount = Number(detail.salesCount || 0);
    const mainPictures = Array.isArray(detail.mainPictures) ? detail.mainPictures.filter(Boolean) : [];
    const detailsObj = detail.details || {};
    const detailsPictures = Array.isArray(detailsObj.pictures)
      ? detailsObj.pictures.filter(Boolean)
      : [];
    const detailProps = Array.isArray(detailsObj.properties)
      ? detailsObj.properties.filter((p) => p && p.name)
      : [];

    products.push([
      productId,
      categoryId,
      productName,
      null,
      spuCode,
      detail.brand && detail.brand.name ? String(detail.brand.name).slice(0, 100) : null,
      mainPictures[0] || null,
      productPrice,
      productOldPrice,
      0,
      salesCount,
      1,
      description,
      now,
      now,
    ]);

    if (mainPictures.length) {
      mainPictures.forEach((url, idx) => {
        productMainImages.push([nextRelId(), productId, String(url), idx, now]);
      });
    }

    if (detailsPictures.length) {
      detailsPictures.forEach((url, idx) => {
        productDetailImages.push([nextRelId(), productId, String(url), idx, now]);
      });
    }

    if (detailProps.length) {
      detailProps.forEach((p, idx) => {
        productDetailProperties.push([
          nextRelId(),
          productId,
          String(p.name).slice(0, 100),
          p.value == null ? '' : String(p.value),
          idx,
          now,
        ]);
      });
    }

    const specNameToSpecId = new Map();
    const specValueKeyToId = new Map();

    const sourceSpecs = Array.isArray(detail.specs) ? detail.specs : [];
    for (let i = 0; i < sourceSpecs.length; i += 1) {
      const spec = sourceSpecs[i];
      const specName = String((spec && spec.name) || `规格${i + 1}`).slice(0, 100);
      let specId = specNameToSpecId.get(specName);
      if (!specId) {
        specId = nextRelId();
        specNameToSpecId.set(specName, specId);
        productSpecs.push([specId, productId, specName, i, now]);
      }

      const values = Array.isArray(spec && spec.values) ? spec.values : [];
      if (!values.length) {
        const fallbackName = '默认';
        const valKey = `${specId}::${fallbackName}`;
        if (!specValueKeyToId.has(valKey)) {
          const valueId = nextRelId();
          specValueKeyToId.set(valKey, valueId);
          productSpecValues.push([valueId, specId, fallbackName, 0, now]);
        }
        continue;
      }

      values.forEach((val, vIndex) => {
        const valueName = String((val && val.name) || `值${vIndex + 1}`).slice(0, 100);
        const valKey = `${specId}::${valueName}`;
        if (!specValueKeyToId.has(valKey)) {
          const valueId = nextRelId();
          specValueKeyToId.set(valKey, valueId);
          productSpecValues.push([valueId, specId, valueName, vIndex, now]);
        }
      });
    }

    if (!specNameToSpecId.size) {
      const specId = nextRelId();
      const valueId = nextRelId();
      specNameToSpecId.set('默认规格', specId);
      specValueKeyToId.set(`${specId}::默认`, valueId);
      productSpecs.push([specId, productId, '默认规格', 0, now]);
      productSpecValues.push([valueId, specId, '默认', 0, now]);
    }

    const allSpecPairs = [];
    for (const [specName, specId] of specNameToSpecId.entries()) {
      const keys = Array.from(specValueKeyToId.keys()).filter((k) =>
        k.startsWith(`${specId}::`),
      );
      if (!keys.length) {
        const valueId = nextRelId();
        const key = `${specId}::默认`;
        specValueKeyToId.set(key, valueId);
        productSpecValues.push([valueId, specId, '默认', 0, now]);
        allSpecPairs.push({ specName, specId, valueName: '默认', valueId });
      } else {
        keys.forEach((k) => {
          const valueName = k.split('::')[1] || '默认';
          allSpecPairs.push({
            specName,
            specId,
            valueName,
            valueId: specValueKeyToId.get(k),
          });
        });
      }
    }

    const sourceSkus = Array.isArray(detail.skus) ? detail.skus : [];
    const ensuredSkus = sourceSkus.length
      ? sourceSkus
      : [
          {
            id: `${productId}01`,
            skuCode: `${productId}-001`,
            price: productPrice,
            oldPrice: productOldPrice,
            inventory: Number(detail.inventory || 0),
            picture: mainPictures[0] || '',
            specs: [
              {
                name: allSpecPairs[0].specName,
                valueName: allSpecPairs[0].valueName,
              },
            ],
          },
        ];

    let totalStock = 0;

    ensuredSkus.forEach((sku, skuIndex) => {
      const skuId = nextRelId();
      const skuCode = uniqueCode(
        sku.skuCode || sku.id || `${productId}-SKU-${skuIndex + 1}`,
        skuCodeSet,
        `SKU-${productId}-`,
        skuIndex + 1,
      );
      const stock = Math.max(0, Number(sku.inventory || 0));
      totalStock += stock;

      productSkus.push([
        skuId,
        productId,
        skuCode,
        sku.picture ? String(sku.picture) : null,
        String(sku.price == null ? productPrice : sku.price),
        String(sku.oldPrice == null ? productOldPrice : sku.oldPrice),
        stock,
        0,
        1,
        now,
        now,
      ]);
      productHasSku.add(productId);

      const skuSpecs = Array.isArray(sku.specs) ? sku.specs : [];
      const links = [];
      for (const s of skuSpecs) {
        const specName = String((s && s.name) || '').trim();
        const valueName = String((s && s.valueName) || '').trim();
        if (!specName || !valueName) continue;

        let specId = specNameToSpecId.get(specName);
        if (!specId) {
          specId = nextRelId();
          specNameToSpecId.set(specName, specId);
          productSpecs.push([specId, productId, specName.slice(0, 100), specNameToSpecId.size, now]);
        }

        const key = `${specId}::${valueName.slice(0, 100)}`;
        let valueId = specValueKeyToId.get(key);
        if (!valueId) {
          valueId = nextRelId();
          specValueKeyToId.set(key, valueId);
          productSpecValues.push([valueId, specId, valueName.slice(0, 100), 0, now]);
        }

        links.push({ specId, valueId });
      }

      if (!links.length) {
        links.push({
          specId: allSpecPairs[0].specId,
          valueId: allSpecPairs[0].valueId,
        });
      }

      const dedupLink = new Set();
      links.forEach((l) => {
        const key = `${l.specId}-${l.valueId}`;
        if (dedupLink.has(key)) return;
        dedupLink.add(key);
        productSkuSpecs.push([nextRelId(), skuId, l.specId, l.valueId, now]);
        productHasSkuSpec.add(productId);
      });
    });

    const productRow = products[products.length - 1];
    productRow[9] = totalStock;
  }

  const categoryIds = new Set(categories.map((r) => String(r[0])));
  for (const row of categories) {
    if (row[2] !== '0' && !categoryIds.has(String(row[2]))) {
      row[2] = '0';
      row[3] = 1;
    }
  }

  return {
    categories,
    products,
    productMainImages,
    productDetailImages,
    productDetailProperties,
    productSpecs,
    productSpecValues,
    productSkus,
    productSkuSpecs,
    metrics: {
      productsWithoutSkus: products.filter((p) => !productHasSku.has(String(p[0]))).length,
      productsWithoutSkuSpecs: products.filter(
        (p) => !productHasSkuSpec.has(String(p[0])),
      ).length,
    },
  };
}

function main() {
  const rows = normalizeRows();

  const sections = [];
  sections.push(
    '-- Auto-generated from goodsDetailsByGuessLike.json by scripts/generate-products-seed-sql.js',
  );
  sections.push('SET NAMES utf8mb4;');
  sections.push('SET FOREIGN_KEY_CHECKS = 0;');

  sections.push('\n-- clear old data');
  sections.push('DELETE FROM `product_sku_specs`;');
  sections.push('DELETE FROM `product_spec_values`;');
  sections.push('DELETE FROM `product_specs`;');
  sections.push('DELETE FROM `product_detail_properties`;');
  sections.push('DELETE FROM `product_detail_images`;');
  sections.push('DELETE FROM `product_main_images`;');
  sections.push('DELETE FROM `product_skus`;');
  sections.push('DELETE FROM `products`;');
  sections.push('DELETE FROM `categories`;');

  sections.push(`\n-- ${TABLES.categories.table} (${rows.categories.length} rows)`);
  sections.push(buildInsert(TABLES.categories.table, TABLES.categories.columns, rows.categories));

  sections.push(`\n-- ${TABLES.products.table} (${rows.products.length} rows)`);
  sections.push(buildInsert(TABLES.products.table, TABLES.products.columns, rows.products));

  sections.push(
    `\n-- ${TABLES.productMainImages.table} (${rows.productMainImages.length} rows)`,
  );
  sections.push(
    buildInsert(
      TABLES.productMainImages.table,
      TABLES.productMainImages.columns,
      rows.productMainImages,
    ),
  );

  sections.push(
    `\n-- ${TABLES.productDetailImages.table} (${rows.productDetailImages.length} rows)`,
  );
  sections.push(
    buildInsert(
      TABLES.productDetailImages.table,
      TABLES.productDetailImages.columns,
      rows.productDetailImages,
    ),
  );

  sections.push(
    `\n-- ${TABLES.productDetailProperties.table} (${rows.productDetailProperties.length} rows)`,
  );
  sections.push(
    buildInsert(
      TABLES.productDetailProperties.table,
      TABLES.productDetailProperties.columns,
      rows.productDetailProperties,
    ),
  );

  sections.push(`\n-- ${TABLES.productSpecs.table} (${rows.productSpecs.length} rows)`);
  sections.push(
    buildInsert(TABLES.productSpecs.table, TABLES.productSpecs.columns, rows.productSpecs),
  );

  sections.push(
    `\n-- ${TABLES.productSpecValues.table} (${rows.productSpecValues.length} rows)`,
  );
  sections.push(
    buildInsert(
      TABLES.productSpecValues.table,
      TABLES.productSpecValues.columns,
      rows.productSpecValues,
    ),
  );

  sections.push(`\n-- ${TABLES.productSkus.table} (${rows.productSkus.length} rows)`);
  sections.push(buildInsert(TABLES.productSkus.table, TABLES.productSkus.columns, rows.productSkus));

  sections.push(
    `\n-- ${TABLES.productSkuSpecs.table} (${rows.productSkuSpecs.length} rows)`,
  );
  sections.push(
    buildInsert(
      TABLES.productSkuSpecs.table,
      TABLES.productSkuSpecs.columns,
      rows.productSkuSpecs,
    ),
  );

  sections.push('\nSET FOREIGN_KEY_CHECKS = 1;');
  fs.writeFileSync(OUTPUT_FILE, sections.join('\n'), 'utf8');

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(
    JSON.stringify(
      {
        categories: rows.categories.length,
        products: rows.products.length,
        product_main_images: rows.productMainImages.length,
        product_detail_images: rows.productDetailImages.length,
        product_detail_properties: rows.productDetailProperties.length,
        product_specs: rows.productSpecs.length,
        product_spec_values: rows.productSpecValues.length,
        product_skus: rows.productSkus.length,
        product_sku_specs: rows.productSkuSpecs.length,
        products_without_skus: rows.metrics.productsWithoutSkus,
        products_without_sku_specs: rows.metrics.productsWithoutSkuSpecs,
      },
      null,
      2,
    ),
  );
}

main();
