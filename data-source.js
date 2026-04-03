"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
const env = process.env.NODE_ENV || 'development';
dotenv.config();
dotenv.config({ path: `.env.${env}` });
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3307,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'example',
    database: process.env.DB_DATABASE || 'testdb',
    timezone: '+08:00',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
    synchronize: false,
});
//# sourceMappingURL=data-source.js.map