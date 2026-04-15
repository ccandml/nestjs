演示地址：
c端：https://uniapp-frotend.pages.dev
b端：https://back-frotend.pages.dev

NestJS 后端数据库初始化使用说明

本说明适用于本项目（NestJS + TypeORM + MySQL），指导如何创建数据库、自动建表并初始化必要数据。

1️⃣ 创建数据库
CREATE DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

将 your_database_name 替换为你的实际数据库名

2️⃣ 配置数据库连接
在 .env 文件中设置：
DB_HOST=your_db_host
DB_PORT=3306
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=your_database_name
DB_SYNCHRONIZE=true

3️⃣ 启动 NestJS 后端
npm install
npm run start:dev
启动后 TypeORM 会自动创建所有实体对应的表
确认日志中没有报错
4️⃣ 执行初始化 SQL
项目提供 necessary-seed.sql 文件，用于插入商品表、角色表...

只有在表已创建的情况下执行，否则会报表不存在或外键错误

5️⃣ 完成初始化
数据库结构和必要数据准备完成
可通过前端或 API 登录 第一个超级管理员
后续可正常管理用户、角色、商品等

💡 提示：

阅读 scripts/generate-super-admin-hash.js ，了解如何创建第一个 超级管理员

开发环境可依赖 synchronize: true 自动建表
生产环境建议关闭 synchronize，并使用 migration 管理表结构

💡 💡 💡
或者直接执行nestdb.sql 直接创建表和全部（测试）数据
