import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// 根据环境变量 NODE_ENV 加载不同的 env 文件
const env = process.env.NODE_ENV || 'development';

dotenv.config(); // 加载默认 .env
dotenv.config({ path: `.env.${env}` }); // 加载 .env.development 或 .env.production（覆盖共用）

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3307,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'example',
  database: process.env.DB_DATABASE || 'testdb',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
});

// 供typeorm下的migration识别配置
// migration是独立于nest之外，无法识别nest
