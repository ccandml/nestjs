// 商品类型
export type GoodsItems = {
  id: string;
  name: string;
  desc: string;
  price: string;
  picture: string;
  orderNum: number;
};

// 接口返回的页面数据
export type PagesResult<T> = {
  //   总条数
  counts: number;
  //   每页条数
  pageSize: number;
  //   总页数
  pages: number;
  //   当前页数
  page: number;
  //   当前页数据
  items: T;
};

// 请求接口的页数据
export type PagesRequest = {
  page: number;
  pageSize: number;
};
