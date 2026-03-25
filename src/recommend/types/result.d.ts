import { GoodsItems, PagesResult } from 'src/types/global';

export type RecommendList = {
  id: string;
  alt: string;
  pictures: string[];
  title: string;
  type: string;
};

export type RecommendDetails = {
  title: string;
  id: string;
  bannerPicture: string;
  subTypes: {
    id: string;
    title: string;
    goodsItems: PagesResult<GoodsItems[]>;
  }[];
};
