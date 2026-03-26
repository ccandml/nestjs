const mysql = require('mysql2/promise');
const division = require('china-area-data');

const root = division['86'] || {};

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
    rows.push([provinceCode, provinceName, null, 1, provinceName]);

    const cityMap = division[provinceCode] || {};
    const cityCodes = sortedCodes(cityMap);

    const isRegionLikeHongKongOrMacao =
      (provinceCode === '810000' || provinceCode === '820000') &&
      cityCodes.length > 0 &&
      cityCodes.every((code) => !code.endsWith('00'));

    if (isRegionLikeHongKongOrMacao) {
      const syntheticCityCode = `${provinceCode.slice(0, 2)}0100`;
      rows.push([
        syntheticCityCode,
        provinceName,
        provinceCode,
        2,
        `${provinceName} ${provinceName}`,
      ]);

      for (const districtCode of cityCodes) {
        const districtName = cityMap[districtCode];
        rows.push([
          toSyntheticCountyCode(districtCode, syntheticCityCode),
          districtName,
          syntheticCityCode,
          3,
          `${provinceName} ${provinceName} ${districtName}`,
        ]);
      }
      continue;
    }

    for (const cityCode of cityCodes) {
      const cityName = normalizeCityName(provinceName, cityMap[cityCode]);
      rows.push([
        cityCode,
        cityName,
        provinceCode,
        2,
        `${provinceName} ${cityName}`,
      ]);

      const countyMap = division[cityCode] || {};
      for (const countyCode of sortedCodes(countyMap)) {
        const countyName = countyMap[countyCode];
        rows.push([
          countyCode,
          countyName,
          cityCode,
          3,
          `${provinceName} ${cityName} ${countyName}`,
        ]);
      }
    }
  }

  // 按编码去重，保留最后一条
  const dedupMap = new Map();
  for (const row of rows) {
    dedupMap.set(row[0], row);
  }
  return Array.from(dedupMap.values());
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'example',
    database: process.env.DB_DATABASE || 'testdb',
    multipleStatements: true,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS city_codes (
      code varchar(9) NOT NULL COMMENT '行政区划编码',
      name varchar(50) NOT NULL COMMENT '地区名称',
      parent_code varchar(9) DEFAULT NULL COMMENT '父级编码',
      level tinyint unsigned NOT NULL COMMENT '层级：1省 2市 3区/县',
      full_name varchar(100) NOT NULL COMMENT '完整地区名称',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      PRIMARY KEY (code),
      KEY idx_city_codes_parent_code (parent_code),
      KEY idx_city_codes_level (level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='省市区编码表';
  `);

  await conn.query(
    `ALTER TABLE city_codes MODIFY COLUMN code VARCHAR(9) NOT NULL, MODIFY COLUMN parent_code VARCHAR(9) NULL;`,
  );

  const rows = buildRows();
  await conn.query('DELETE FROM city_codes');

  const now = '2026-03-26 00:00:00';
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map((row) => [...row, now, now]);
    await conn.query(
      'REPLACE INTO city_codes (code, name, parent_code, level, full_name, created_at, updated_at) VALUES ?',
      [batch],
    );
  }

  const [[countRow]] = await conn.query(
    'SELECT COUNT(*) AS total FROM city_codes',
  );
  console.log(`city_codes inserted: ${countRow.total}`);

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
