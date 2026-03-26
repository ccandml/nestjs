/** 收货地址列表项 */
export type AddressItem = {
  /** 收货人姓名 */
  receiver: string;
  /** 联系方式 */
  contact: string;
  /** 地区编码（单编码） */
  locationCode: string;
  /** 详细地址 */
  address: string;
  /** 默认地址，1为是，0为否 */
  isDefault: number;
  /** 收货地址 id */
  id: string;
  /** 省市区 */
  fullLocation: string;
};
