// 枚举值只存「环境变量的键名」，值在 .env 文件中配置
export enum ConfigEnum {
  DB_TYPE = 'DB_TYPE',
  DB_HOST = 'DB_HOST', // 对应 .env 中的 DB_HOST 键
  DB_PORT = 'DB_PORT', // 对应 .env 中的 DB_PORT 键
  DB_USERNAME = 'DB_USERNAME', // 对应 .env 中的 DB_USERNAME 键
  DB_PASSWORD = 'DB_PASSWORD', // 对应 .env 中的 DB_PASSWORD 键
  DB_DATABASE = 'DB_DATABASE', // 对应 .env 中的 DB_DATABASE 键
  DB_SYNCHRONIZE = 'DB_SYNCHRONIZE', // 对应 .env 中的 DB_SYNCHRONIZE 键

  SECRET_TOKEN = 'SECRET_TOKEN', // 密钥
}
