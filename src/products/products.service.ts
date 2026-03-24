import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { GoodsResult } from './types/result';
import { ProductSku } from './entities/product-skus.entity';
import { GuessQueryDto } from './dto/products-query.dto';

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
    const [list, total] = await this.productRepository.findAndCount({
      relations: ['mainImages'],
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { salesCount: 'DESC' },
    });

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
      relations: [
        'mainImages',
        'detailImages',
        'detailProperties',
        'specs',
        'specs.values',
        'skus',
        'skus.skuSpecs',
        'skus.skuSpecs.spec',
        'skus.skuSpecs.specValue',
      ],
    });

    if (!product) return null;

    if (!product.detailProperties?.length) {
      this.logger.warn(
        `商品详情属性为空: productId=${id}, detailProperties=${product.detailProperties?.length ?? 0}, detailImages=${product.detailImages?.length ?? 0}, specs=${product.specs?.length ?? 0}, skus=${product.skus?.length ?? 0}`,
      );
    }

    return {
      id: product.id,
      name: product.name,
      desc: product.description || '',
      price: product.price,
      oldPrice: Number(product.originalPrice),

      /** 主图 */
      mainPictures: product.mainImages.map((item) => item.imageUrl),

      /** 详情 */
      details: {
        properties: product.detailProperties.map((item) => ({
          name: item.propertyName,
          value: item.propertyValue,
        })),
        pictures: product.detailImages.map((item) => item.imageUrl),
      },

      /** SKU */
      skus: product.skus.map((sku) => ({
        id: sku.id,
        inventory: sku.stock,
        oldPrice: Number(sku.originalPrice),
        picture: sku.imageUrl || '',
        price: Number(sku.price),
        skuCode: sku.skuCode,

        specs: sku.skuSpecs.map((item) => ({
          name: item.spec?.specName || '',
          valueName: item.specValue?.valueName || '',
        })),
      })),

      /** 规格（重点） */
      specs: product.specs.map((spec) => ({
        name: spec.specName,
        values: spec.values.map((value) => ({
          name: value.valueName,
          desc: '',
          picture: '',
          available: true, // 商品是否可选（联动库存时用到），现在没做库存，可以先写死 true
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
