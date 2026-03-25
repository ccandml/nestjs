import { Gender } from '../entities/user.entity';

/** 个人信息 用户详情信息 */
export type ProfileDetail = {
  /** 用户ID */
  id: number;
  /** 昵称 */
  username: string;
  /** 密码 */
  password: string;
  /** 性别 */
  gender?: Gender;
  /** 生日 */
  birthday?: string;
  /** 头像  */
  avatar: string;
  /** 省市区 */
  fullLocation?: string;
  /** 职业 */
  profession?: string;
};
