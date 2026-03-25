import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { GoodsResult } from './types/result';
import { ProductDetailImage } from './entities/product-detail-images.entity';
import { ProductDetailProperty } from './entities/product-detail-properties.entity';
import { ProductMainImage } from './entities/product-main-images.entity';
import { ProductSku } from './entities/product-skus.entity';
import { ProductSkuSpec } from './entities/product-sku-specs.entity';
import { ProductSpecValue } from './entities/product-spec-values.entity';
import { ProductSpec } from './entities/product-specs.entity';
import {
  GuessQueryDto,
  SearchProductsQueryDto,
} from './dto/products-query.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductSku)
    private skuRepository: Repository<ProductSku>,
  ) {}

  // 获取”猜你喜欢“商品列表
  async getGuessLikeProducts(query: GuessQueryDto) {
    const { page = 1, pageSize = 10 } = query;
    const [list, total] = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .distinct(true)
      .orderBy('RAND()')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      counts: total,
      pageSize,
      pages: Math.ceil(total / pageSize),
      page,
      items: list.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.description || '',
        price: Number(item.price),
        picture: item.mainImages?.[0]?.imageUrl || '',
        discount: 1,
        orderNum: item.salesCount || 0,
      })),
    };
  }

  // 按商品名 + 描述 + 分类 + 品牌 + 标签搜索商品
  async searchProducts(query: SearchProductsQueryDto) {
    const { keyword, page = 1, pageSize = 10 } = query;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .leftJoin('product.category', 'category')
      .leftJoin('product.detailProperties', 'detailProperty')
      .where('product.status = :status', { status: 1 })
      .distinct(true)
      .orderBy('product.id', 'DESC');

    if (keyword?.trim()) {
      // 标签维度映射到详情属性（propertyName/propertyValue）进行模糊匹配
      qb.andWhere(
        new Brackets((tagQb) => {
          tagQb
            .where('product.name LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            })
            .orWhere('product.description LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            })
            .orWhere('category.name LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            })
            .orWhere('product.brand LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            })
            .orWhere('detailProperty.propertyName LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            })
            .orWhere('detailProperty.propertyValue LIKE :keyword', {
              keyword: `%${keyword.trim()}%`,
            });
        }),
      );
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      counts: total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      items: list.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.description || '',
        price: Number(item.price),
        picture: item.mainImages?.[0]?.imageUrl || item.mainImage || '',
        discount: 1,
        orderNum: item.salesCount || 0,
      })),
    };
  }

  // 获取多个商品数据
  async getProducts(data: any) {
    const { categoryId, pageSize, page } = data;
    const [list, total] = await this.productRepository.findAndCount({
      where: { categoryId },
      relations: ['mainImages'], // 为了拿 picture
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { id: 'DESC' },
    });

    return {
      counts: total,
      page: Number(page),
      pageSize: Number(pageSize),
      pages: Math.ceil(total / pageSize),

      items: list.map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.description || '',
        price: Number(item.price),

        // 主图（取第一张）
        picture: item.mainImages?.[0]?.imageUrl || '',

        // 你目前没有折扣字段，可以先写死或自己算
        discount: 1,

        // 你目前没做销量，可以先写死
        orderNum: 0,
      })),
    };
  }

  // 获取单个商品详情
  async getProductDetail(id: string): Promise<GoodsResult | null> {
    const product = await this.productRepository.findOne({
      where: { id },
      select: ['id', 'name', 'description', 'price', 'originalPrice'],
    });

    if (!product) return null;
    // 商品主信息先单查（仅必要字段），后续的关联数据再用更灵活的方式查（下面会看到，关联数据的查询比较复杂，单靠typeorm的关系配置很难实现）
    const manager = this.productRepository.manager;
    const [mainImages, detailImages, detailProperties, specs, skus] =
      await Promise.all([
        manager.getRepository(ProductMainImage).find({
          where: { productId: id },
          select: ['imageUrl', 'sortOrder'],
          order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(ProductDetailImage).find({
          where: { productId: id },
          select: ['imageUrl', 'sortOrder'],
          order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(ProductDetailProperty).find({
          where: { productId: id },
          select: ['propertyName', 'propertyValue', 'sortOrder'],
          order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(ProductSpec).find({
          where: { productId: id },
          select: ['id', 'specName', 'sortOrder'],
          order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(ProductSku).find({
          where: { productId: id },
          select: [
            'id',
            'stock',
            'originalPrice',
            'imageUrl',
            'price',
            'skuCode',
          ],
          order: { id: 'ASC' },
        }),
      ]);

    const specIds = specs.map((spec) => spec.id);
    const skuIds = skus.map((sku) => sku.id);

    const [specValues, skuSpecRows] = await Promise.all([
      specIds.length
        ? manager.getRepository(ProductSpecValue).find({
            where: { specId: In(specIds) },
            select: ['id', 'specId', 'valueName', 'sortOrder'],
            order: { sortOrder: 'ASC', id: 'ASC' },
          })
        : Promise.resolve([]),
      skuIds.length
        ? manager
            .getRepository(ProductSkuSpec)
            .createQueryBuilder('skuSpec')
            .leftJoin('skuSpec.spec', 'spec')
            .leftJoin('skuSpec.specValue', 'specValue')
            .select([
              'skuSpec.skuId AS skuId',
              'spec.specName AS specName',
              'specValue.valueName AS valueName',
            ])
            .where('skuSpec.skuId IN (:...skuIds)', { skuIds })
            .orderBy('skuSpec.id', 'ASC')
            .getRawMany<{
              skuId: string;
              specName: string | null;
              valueName: string | null;
            }>()
        : Promise.resolve([]),
    ]);

    const specValuesMap = new Map<string, ProductSpecValue[]>();
    for (const value of specValues) {
      const bucket = specValuesMap.get(value.specId) || [];
      bucket.push(value);
      specValuesMap.set(value.specId, bucket);
    }

    const skuSpecsMap = new Map<
      string,
      { name: string; valueName: string }[]
    >();
    for (const row of skuSpecRows) {
      const bucket = skuSpecsMap.get(row.skuId) || [];
      bucket.push({
        name: row.specName || '',
        valueName: row.valueName || '',
      });
      skuSpecsMap.set(row.skuId, bucket);
    }

    if (!detailProperties.length) {
      this.logger.warn(
        `商品详情属性为空: productId=${id}, detailProperties=${detailProperties.length}, detailImages=${detailImages.length}, specs=${specs.length}, skus=${skus.length}`,
      );
    }

    return {
      id: product.id,
      name: product.name,
      desc: product.description || '',
      price: product.price,
      oldPrice: Number(product.originalPrice),

      /** 主图 */
      mainPictures: mainImages.map((item) => item.imageUrl),

      /** 详情 */
      details: {
        properties: detailProperties.map((item) => ({
          name: item.propertyName,
          value: item.propertyValue,
        })),
        pictures: detailImages.map((item) => item.imageUrl),
      },

      /** SKU */
      skus: skus.map((sku) => ({
        id: sku.id,
        inventory: sku.stock,
        oldPrice: Number(sku.originalPrice),
        picture: sku.imageUrl || '',
        price: Number(sku.price),
        skuCode: sku.skuCode,

        specs: skuSpecsMap.get(sku.id) || [],
      })),

      /** 规格（重点） */
      specs: specs.map((spec) => ({
        name: spec.specName,
        values: (specValuesMap.get(spec.id) || []).map((value) => ({
          name: value.valueName,
          desc: '',
          picture: '',
          available: true, // 前端的sku组件自动根据库存情况判断是否可选，这里先全部返回true
        })),
      })),
    };
  }

  // 批量查商品（带主图）
  async findProductsByIds(ids: string[]) {
    return this.productRepository.find({
      where: { id: In(ids) },
      relations: ['mainImages'],
    });
  }

  //  查 SKU
  async findSku(skuId: string) {
    const sku = await this.skuRepository.findOne({
      where: { id: skuId },
    });
    return sku;
  }

  // 批量查 SKU（带规格）
  async findSkusByIds(ids: string[]) {
    return this.skuRepository.find({
      where: { id: In(ids) },
      relations: ['product', 'skuSpecs', 'skuSpecs.spec', 'skuSpecs.specValue'],
    });
  }

  // 扣库存前检查
  async validateSkuStock(items: { skuId: string; count: number }[]) {
    const skuIds = items.map((item) => item.skuId);
    const skuList = await this.findSkusByIds(skuIds);
    const skuMap = new Map(skuList.map((sku) => [sku.id, sku]));

    for (const item of items) {
      const sku = skuMap.get(item.skuId);
      if (!sku) {
        throw new NotFoundException(`SKU不存在: ${item.skuId}`);
      }
      if (sku.stock < item.count) {
        throw new BadRequestException(`库存不足: ${item.skuId}`);
      }
    }
    return skuList;
  }

  // 遍历扣除库存（包在事务里面执行）
  async decreaseSkuStock(
    items: { skuId: string; count: number }[],
    manager?: EntityManager,
  ) {
    // 如果传入了manager（事务），就用事务里的仓库；否则用默认仓库
    const repo = manager
      ? manager.getRepository(ProductSku)
      : this.skuRepository;
    // 循环遍历所有要扣减库存的商品
    for (const item of items) {
      const result = await repo
        .createQueryBuilder()
        .update(ProductSku)
        .set({
          stock: () => `stock - ${item.count}`,
        })
        .where('id = :skuId', { skuId: item.skuId })
        .andWhere('stock >= :count', { count: item.count })
        .execute();
      // affected：受影响的行数（0=没扣成功，1=扣成功）
      if (!result.affected) {
        throw new BadRequestException(`库存不足或SKU不存在: ${item.skuId}`);
      }
    }
  }
}
