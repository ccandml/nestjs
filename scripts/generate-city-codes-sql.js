const fs = require('fs');
const path = require('path');
const division = require('china-area-data');

const root = division['86'] || {};

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function sortedCodes(obj) {
  return Object.keys(obj).sort((a, b) => Number(a) - Number(b));
}

function normalizeCityName(provinceName, cityName) {
  if (cityName === '市辖区' || cityName === '县') {
    return provinceName;
  }
  return cityName;
}

function toSyntheticCountyCode(originCode, syntheticCityCode) {
  const suffix = originCode.slice(4, 6);
  return `${syntheticCityCode.slice(0, 4)}${suffix}`;
}

function buildRows() {
  const rows = [];
  const provinceCodes = sortedCodes(root);

  for (const provinceCode of provinceCodes) {
    const provinceName = root[provinceCode];
    rows.push({
      code: provinceCode,
      name: provinceName,
      parentCode: null,
      level: 1,
      fullName: provinceName,
    });

    const cityMap = division[provinceCode] || {};
    const cityCodes = sortedCodes(cityMap);

    // 港澳原始数据是“省级 -> 区级”，这里补一层市级，兼容现有省/市/区三段编码校验。
    const isRegionLikeHongKongOrMacao =
      (provinceCode === '810000' || provinceCode === '820000') &&
      cityCodes.length > 0 &&
      cityCodes.every((code) => !code.endsWith('00'));

    if (isRegionLikeHongKongOrMacao) {
      const syntheticCityCode = `${provinceCode.slice(0, 2)}0100`;
      rows.push({
        code: syntheticCityCode,
        name: provinceName,
        parentCode: provinceCode,
        level: 2,
        fullName: `${provinceName} ${provinceName}`,
      });

      for (const districtCode of cityCodes) {
        const districtName = cityMap[districtCode];
        rows.push({
          code: toSyntheticCountyCode(districtCode, syntheticCityCode),
          name: districtName,
          parentCode: syntheticCityCode,
          level: 3,
          fullName: `${provinceName} ${provinceName} ${districtName}`,
        });
      }
      continue;
    }

    for (const cityCode of cityCodes) {
      const cityNameRaw = cityMap[cityCode];
      const cityName = normalizeCityName(provinceName, cityNameRaw);
      rows.push({
        code: cityCode,
        name: cityName,
        parentCode: provinceCode,
        level: 2,
        fullName: `${provinceName} ${cityName}`,
      });

      const countyMap = division[cityCode] || {};
      const countyCodes = sortedCodes(countyMap);

      for (const countyCode of countyCodes) {
        const countyName = countyMap[countyCode];
        rows.push({
          code: countyCode,
          name: countyName,
          parentCode: cityCode,
          level: 3,
          fullName: `${provinceName} ${cityName} ${countyName}`,
        });
      }
    }
  }

  // 按行政区划编码去重，确保可直接执行 INSERT 不触发主键冲突。
  const dedupMap = new Map();
  for (const row of rows) {
    if (!dedupMap.has(row.code)) {
      dedupMap.set(row.code, row);
    }
  }

  return Array.from(dedupMap.values());
}

function buildCreateTableSql() {
  return [
    '-- city codes',
    'CREATE TABLE IF NOT EXISTS `city_codes` (',
    "  `code` varchar(9) NOT NULL COMMENT '行政区划编码',",
    "  `name` varchar(50) NOT NULL COMMENT '地区名称',",
    "  `parent_code` varchar(9) DEFAULT NULL COMMENT '父级编码',",
    "  `level` tinyint unsigned NOT NULL COMMENT '层级：1省 2市 3区/县',",
    "  `full_name` varchar(100) NOT NULL COMMENT '完整地区名称',",
    "  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',",
    "  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',",
    '  PRIMARY KEY (`code`),',
    '  KEY `idx_city_codes_parent_code` (`parent_code`),',
    '  KEY `idx_city_codes_level` (`level`)',
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='省市区编码表';",
  ].join('\n');
}

function buildInsertSql(rows) {
  const lines = rows.map((row) => {
    const parentCode = row.parentCode
      ? `'${escapeSql(row.parentCode)}'`
      : 'NULL';
    return `('${escapeSql(row.code)}', '${escapeSql(row.name)}', ${parentCode}, ${row.level}, '${escapeSql(row.fullName)}', '2026-03-26 00:00:00', '2026-03-26 00:00:00')`;
  });

  return [
    `-- city_codes (${rows.length} rows)`,
    'INSERT INTO `city_codes` (`code`, `name`, `parent_code`, `level`, `full_name`, `created_at`, `updated_at`) VALUES',
    `${lines.join(',\n')};`,
  ].join('\n');
}

function buildSeedSql(rows) {
  const insertSql = buildInsertSql(rows);
  return [
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
    buildCreateTableSql(),
    '',
    'DELETE FROM `city_codes`;',
    '',
    insertSql,
    '',
    'SET FOREIGN_KEY_CHECKS = 1;',
    '',
  ].join('\n');
}

function updateProductsSeedSql(rows, productsSeedPath) {
  const source = fs.readFileSync(productsSeedPath, 'utf8');
  const insertSql = buildInsertSql(rows);
  const createTableSql = buildCreateTableSql();

  const cityBlockStartToken = '-- city codes';
  const clearOldDataToken = '-- clear old data';
  const cityBlockStartIndex = source.indexOf(cityBlockStartToken);
  const clearOldDataIndex = source.indexOf(clearOldDataToken);

  if (
    cityBlockStartIndex === -1 ||
    clearOldDataIndex === -1 ||
    clearOldDataIndex <= cityBlockStartIndex
  ) {
    throw new Error('products-seed.sql 中未找到 city_codes 建表块标记');
  }

  const withUpdatedTable =
    source.slice(0, cityBlockStartIndex) +
    `${createTableSql}\n\n` +
    source.slice(clearOldDataIndex);

  const startToken = '-- city_codes (';
  const endToken = '-- categories (56 rows)';
  const startIndex = withUpdatedTable.indexOf(startToken);
  const endIndex = withUpdatedTable.indexOf(endToken);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('products-seed.sql 中未找到 city_codes 数据块标记');
  }

  const before = withUpdatedTable.slice(0, startIndex);
  const after = withUpdatedTable.slice(endIndex);
  const next = `${before}${insertSql}\n\n${after}`;

  fs.writeFileSync(productsSeedPath, next, 'utf8');
}

function main() {
  const rows = buildRows();
  const rootDir = path.resolve(__dirname, '..');
  const citySeedPath = path.join(rootDir, 'city-codes-seed.sql');
  const productsSeedPath = path.join(rootDir, 'products-seed.sql');

  fs.writeFileSync(citySeedPath, buildSeedSql(rows), 'utf8');
  updateProductsSeedSql(rows, productsSeedPath);

  console.log(`city_codes total rows: ${rows.length}`);
  console.log(`generated: ${citySeedPath}`);
  console.log(`updated: ${productsSeedPath}`);
}

main();
