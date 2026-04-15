# 微信小程序登录功能说明

## 功能介绍

本项目已集成微信小程序登录功能，前端通过传递 WeChat `code` 参数，后端调用微信官方接口 `code2Session` 获取用户的 `openid`，然后实现以下逻辑：

1. **老用户登录**：如果该 `openid` 已存在用户表中，直接登录
2. **新用户注册**：如果该 `openid` 不存在，自动为用户创建账号并执行登录流程

## 环境变量配置

在项目根目录的 `.env` 文件中，需要添加以下配置：

```bash
# 微信小程序配置
# APPID 和 AppSecret 可从微信公众平台（https://mp.weixin.qq.com）获取
WECHAT_APPID=your_wechat_appid_here
WECHAT_APPSECRET=your_wechat_appsecret_here
```

## 接口文档

### 微信小程序登录接口

**请求方式**：POST  
**请求路径**：`/auth/wechat-signin`  
**请求头**：`Content-Type: application/json`

**请求参数**：

```json
{
  "code": "string (必填) - 前端授权登录后获得的 code"
}
```

**成功响应 (200)**：

```json
{
  "access_token": "JWT token 字符串，用于后续请求验证",
  "id": 123,
  "username": "wechat_abc123456_xyz789",
  "openid": "用户微信小程序唯一标识",
  "avatar": "用户头像 URL (可能为 null)",
  "roleNames": ["普通用户"]
}
```

**错误响应示例**：

- **code 为空** (400)：

```json
{
  "statusCode": 400,
  "message": "code 参数不能为空"
}
```

- **微信配置未完成** (500)：

```json
{
  "statusCode": 500,
  "message": "微信小程序配置未完成，请检查 WECHAT_APPID 和 WECHAT_APPSECRET"
}
```

- **微信鉴权失败** (401)：

```json
{
  "statusCode": 401,
  "message": "微信鉴权失败: invalid code"
}
```

- **网络连接失败** (503)：

```json
{
  "statusCode": 503,
  "message": "无法连接到微信服务，请稍后重试"
}
```

## 数据库表结构

用户表 (`user`) 新增字段：

| 字段名 | 类型    | 长度 | 可空 | 唯一 | 注释                   |
| ------ | ------- | ---- | ---- | ---- | ---------------------- |
| openid | varchar | 128  | YES  | YES  | 微信小程序用户唯一标识 |

## 用户字段说明

- **openid**：微信小程序用户的唯一标识符
  - 同一用户在同一小程序内的 openid 永远相同
  - 不同小程序的同一用户的 openid 不同
  - 用户在小程序内修改昵称、头像等信息不会影响 openid
  - 设置为唯一键，防止多个微信账号绑定到同一个用户

## 工作流程

```
前端获得 code
    ↓
POST /auth/wechat-signin { code }
    ↓
后端调用微信 code2Session 接口
    ↓
获得 openid 和 session_key
    ↓
数据库查询是否存在该 openid 的用户
    ↓
├─ 存在 → 直接返回登录结果 (access_token 等)
└─ 不存在 → 自动创建用户 → 返回登录结果
    ↓
前端收到 access_token，后续请求在 Authorization header 中携带
```

## 迁移 (Migration)

项目已创建迁移文件 `src/migrations/1775800000000-add-user-openid.ts` 来添加 openid 字段。

执行迁移命令：

```bash
npm run migration:run
```

## 注意事项

1. **安全性**：
   - 微信 AppSecret 不应该在前端使用，必须由后端调用
   - 后端需要妥善保管 AppSecret，不要提交到代码仓库
   - 建议通过环境变量管理敏感信息

2. **错误处理**：
   - 微信接口可能因网络问题超时，建议前端设置重试机制
   - 无效的 code（如已过期）会触发 401 错误

3. **用户创建**：
   - 自动创建的微信用户，用户名由 `wechat_openid前12位_随机数` 组成
   - 为了安全考虑，生成的密码是随机字符串，微信用户无法通过用户名和密码登录
   - 如需支持，可在后续功能中添加"绑定手机号"或"设置密码"功能

4. **测试**：
   - 本地开发时，确保配置了正确的 WECHAT_APPID 和 WECHAT_APPSECRET
   - 微信官方提供了测试工具，可用于验证 code2Session 接口
