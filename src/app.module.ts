import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { RangeModule } from './range/range.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';
import ormconfig from 'ormconfig';

const envFilePath = `.env.${process.env.NODE_ENV || `development`}`;

@Module({
  imports: [
    // 全局管家，拿到env的配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', envFilePath], // 先读env， 后读envFilePath(后者覆盖前者)
      validationSchema: Joi.object({
        // 校验数据库配置的类型和必填性
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(3307),
        DB_USERNAME: Joi.string().default('root'),
        DB_PASSWORD: Joi.string().default('example'),
        DB_DATABASE: Joi.string().default('testdb'),
        DB_SYNCHRONIZE: Joi.boolean().default(true),
      }),
    }),
    // 连接数据库的装修队
    TypeOrmModule.forRoot(ormconfig),
    UserModule,
    RangeModule,
    RolesModule,
    LogsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
