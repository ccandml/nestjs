import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { RangeModule } from './range/range.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigEnum } from './enum/config.enum';
import * as Joi from 'joi';
import { User } from './user/user.entity';
import { Profile } from './user/profile.entity';
import { Logs } from './logs/logs.entity';
import { Roles } from './roles/roles.entity';
import { RolesModule } from './roles/roles.module';
import { LogsModule } from './logs/logs.module';

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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService], //给装修队介绍管家
      // 装修队要问管家拿到对应的配置来连接数据库
      useFactory: (configService: ConfigService) =>
        ({
          // 管家configService 靠get()拿到配置
          type: configService.get(ConfigEnum.DB_TYPE),
          host: configService.get(ConfigEnum.DB_HOST),
          port: configService.get(ConfigEnum.DB_PORT),
          username: configService.get(ConfigEnum.DB_USERNAME),
          password: configService.get(ConfigEnum.DB_PASSWORD),
          database: configService.get(ConfigEnum.DB_DATABASE),
          entities: [User, Profile, Logs, Roles],
          synchronize: configService.get(ConfigEnum.DB_SYNCHRONIZE),
          // logging: ['error'],
          logging: process.env.NODE_ENV === 'development', // 开发环境下打印sql语句
        }) as TypeOrmModuleOptions,
    }),
    UserModule,
    RangeModule,
    RolesModule,
    LogsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
