import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Recommend } from './entities/recommend.entity';
import { RecommendList, RecommendDetails } from './types/result.d';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { GoodsItems } from '../types/global';

@Injectable()
export class RecommendService {
  constructor(
    @InjectRepository(Recommend)
    private recommendRepository: Repository<Recommend>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  /**
   * 获取推荐列表
   * 将数据库数据转换为前端所需的 RecommendList 格式
   * 每个推荐项返回不同的商品主图，全局不重复
   */
  async getRecommendList(type?: number): Promise<RecommendList[]> {
    const hasType = Number.isFinite(type);
    const data = await this.recommendRepository.find({
      where: hasType ? { type: Number(type) } : {},
    });
    // 查询所有有主图的商品
    const products = await this.productRepository.find({
      where: {
        mainImage: Not(IsNull()),
        status: 1,
      }, // 过滤有主图且已上架的商品
      select: ['mainImage'],
    });

    if (products.length === 0) {
      return data.map((item) => ({
        id: item.id,
        alt: item.alt,
        pictures: [],
        title: item.title,
        type: String(item.type),
      }));
    }

    // 获取所有唯一的图片URL并打乱顺序
    const uniquePictures = [
      ...new Set(products.map((p) => p.mainImage).filter(Boolean)),
    ];

    // Fisher-Yates 打乱算法
    for (let i = uniquePictures.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniquePictures[i], uniquePictures[j]] = [
        uniquePictures[j],
        uniquePictures[i],
      ];
    }

    let pictureIndex = 0;

    return data.map((item) => {
      const pictures: string[] = [];
      // 为每个推荐项分配2个不重复的图片
      for (let i = 0; i < 2 && pictureIndex < uniquePictures.length; i++) {
        pictures.push(uniquePictures[pictureIndex++]);
      }

      return {
        id: item.id,
        alt: item.alt,
        pictures,
        title: item.title,
        type: String(item.type), // 将数字类型转换为字符串
      };
    });
  }

  /**
   * 获取热门面板数据
   * 返回推荐模块的详细数据，包含所有子分类及对应的随机商品
   */
  async getRecommendDetails(
    type?: number,
    page = 1,
    pageSize = 10,
  ): Promise<RecommendDetails> {
    const hasType = Number.isFinite(type);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
    const total = await this.productRepository.count({
      where: {
        mainImage: Not(IsNull()),
        status: 1,
      },
    });
    const totalPages = total > 0 ? Math.ceil(total / safePageSize) : 0;
    const currentPage = totalPages > 0 ? Math.min(safePage, totalPages) : 1;
    const currentSkip = (currentPage - 1) * safePageSize;
    const queryBuilder = this.recommendRepository
      .createQueryBuilder('r')
      .orderBy('r.id', 'ASC');

    if (hasType) {
      queryBuilder.where('r.type = :type', { type: Number(type) });
    }

    const item = await queryBuilder.getOne();

    if (!item) {
      return {
        title: '',
        id: '',
        bannerPicture: '',
        subTypes: [],
      };
    }
    const usedGoodsSignatures = new Set<string>();
    const subTypes: RecommendDetails['subTypes'] = [];
    let subTypeSerial = 1;

    for (const categoryId of item.subTypes || []) {
      const normalizedSubTypeId =
        String(categoryId).replace(/\D/g, '') || String(subTypeSerial++);
      // 查询分类信息
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId as any },
      });

      const subTypeTitle = category?.name || String(categoryId);

      const getRandomGoodsItems = async (): Promise<GoodsItems[]> => {
        const products = await this.productRepository
          .createQueryBuilder('p')
          .select(['p.id', 'p.name', 'p.price', 'p.mainImage'])
          .where('p.mainImage IS NOT NULL')
          .andWhere('p.status = :status', { status: 1 })
          .orderBy('RAND()')
          .offset(currentSkip)
          .limit(safePageSize)
          .getMany();

        // 随机分页在数据量较小时可能落空，这里兜底到随机首页
        if (products.length === 0 && total > 0) {
          const fallback = await this.productRepository
            .createQueryBuilder('p')
            .select(['p.id', 'p.name', 'p.price', 'p.mainImage'])
            .where('p.mainImage IS NOT NULL')
            .andWhere('p.status = :status', { status: 1 })
            .orderBy('RAND()')
            .limit(safePageSize)
            .getMany();

          return fallback.map((p) => ({
            id: p.id,
            name: p.name,
            desc: '',
            price: p.price,
            picture: p.mainImage || '',
            orderNum: 0,
          }));
        }

        return products.map((p) => ({
          id: p.id,
          name: p.name,
          desc: '',
          price: p.price,
          picture: p.mainImage || '',
          orderNum: 0,
        }));
      };

      let goodsItems = await getRandomGoodsItems();
      let signature = goodsItems
        .map((g) => g.id)
        .sort()
        .join(',');

      // 同一组推荐里的子分类商品不要求完全不重复，只需避免“完全一样”的列表
      if (signature && usedGoodsSignatures.has(signature)) {
        const retriedItems = await getRandomGoodsItems();
        const retriedSignature = retriedItems
          .map((g) => g.id)
          .sort()
          .join(',');

        if (!usedGoodsSignatures.has(retriedSignature)) {
          goodsItems = retriedItems;
          signature = retriedSignature;
        }
      }

      if (goodsItems.length === 0 && total > 0) {
        goodsItems = await getRandomGoodsItems();
        signature = goodsItems
          .map((g) => g.id)
          .sort()
          .join(',');
      }

      if (signature) {
        usedGoodsSignatures.add(signature);
      }

      subTypes.push({
        id: normalizedSubTypeId,
        title: subTypeTitle,
        goodsItems: {
          counts: total,
          pageSize: safePageSize,
          pages: totalPages,
          page: currentPage,
          items: goodsItems,
        },
      });
    }

    return {
      title: item.title,
      id: item.id,
      bannerPicture: item.bannerPicture,
      subTypes,
    };
  }
}
