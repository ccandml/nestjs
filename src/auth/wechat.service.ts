import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * 微信 code2Session 响应接口
 */
interface WechatCode2SessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  // 微信官方 code2Session 接口地址
  private readonly WECHAT_CODE2SESSION_URL =
    'https://api.weixin.qq.com/sns/jscode2session';

  constructor(private configService: ConfigService) {}

  /**
   * 调用微信官方 code2Session 接口
   * 根据前端传来的 code 获取 openid 和 session_key
   *
   * @param code 微信小程序前端授权登录返回的 code
   * @returns 包含 openid、session_key 等信息的响应数据
   * @throws 请求失败或微信返回错误时抛出异常
   */
  async code2Session(code: string): Promise<WechatCode2SessionResponse> {
    try {
      const appId = this.configService.get<string>('WECHAT_APPID');
      const appSecret = this.configService.get<string>('WECHAT_APPSECRET');

      if (!appId || !appSecret) {
        throw new HttpException(
          '微信小程序配置未完成，请检查 WECHAT_APPID 和 WECHAT_APPSECRET',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 调用微信官方接口
      const response = await axios.get<WechatCode2SessionResponse>(
        this.WECHAT_CODE2SESSION_URL,
        {
          params: {
            appid: appId,
            secret: appSecret,
            js_code: code,
            grant_type: 'authorization_code',
          },
          timeout: 5000, // 5秒超时
        },
      );

      const data = response.data;

      // 微信返回错误时处理
      if (data.errcode) {
        throw new HttpException(
          `微信鉴权失败: ${data.errmsg}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // 网络请求错误
      throw new HttpException(
        '无法连接到微信服务，请稍后重试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
