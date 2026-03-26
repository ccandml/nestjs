SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) 确保 user_addresses 表存在（最新单编码结构）
CREATE TABLE IF NOT EXISTS `user_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '收货地址ID',
  `user_id` bigint unsigned NOT NULL COMMENT '用户ID',
  `receiver` varchar(50) NOT NULL COMMENT '收货人姓名',
  `contact` varchar(20) NOT NULL COMMENT '联系方式',
  `location_code` varchar(9) NOT NULL COMMENT '地区编码（单编码）',
  `address` varchar(255) NOT NULL COMMENT '详细地址',
  `is_default` tinyint NOT NULL DEFAULT '0' COMMENT '默认地址，1为是，0为否',
  `full_location` varchar(100) NOT NULL COMMENT '省市区',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收货地址表';

-- 2) 若是旧结构（三段编码），补齐 location_code 并回填
ALTER TABLE `user_addresses`
  ADD COLUMN IF NOT EXISTS `location_code` varchar(9) NULL COMMENT '地区编码（单编码）';

UPDATE `user_addresses`
SET `location_code` = COALESCE(`location_code`, `county_code`, `city_code`, `province_code`)
WHERE `location_code` IS NULL;

-- 3) 调整字段定义到最新版本
ALTER TABLE `user_addresses`
  MODIFY COLUMN `location_code` varchar(9) NOT NULL COMMENT '地区编码（单编码）',
  MODIFY COLUMN `full_location` varchar(100) NOT NULL COMMENT '省市区';

-- 4) 清理旧三段编码字段
ALTER TABLE `user_addresses`
  DROP COLUMN IF EXISTS `province_code`,
  DROP COLUMN IF EXISTS `city_code`,
  DROP COLUMN IF EXISTS `county_code`;

SET FOREIGN_KEY_CHECKS = 1;
