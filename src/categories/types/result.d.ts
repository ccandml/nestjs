import { GoodsItems } from 'src/types/global';

export type ClassifyData = {
  id: string;
  name: string;
  picture: string;
  imageBanners: string[];
  children: {
    id: string;
    name: string;
    picture: string;
    parentId: any;
    parentName: any;
    goods: GoodsItems[];
  }[];
};
