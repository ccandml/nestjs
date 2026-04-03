import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, EntityManager, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { GoodsResult, ProductsList, SkuItem } from './types/result';
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
import { UpdateSkuDto } from './dto/update-sku.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  // 商品上架判定统一以 SKU 状态为准：存在任一 status=1 的 SKU 即视为上架
  private static readonly HAS_ON_SALE_SKU_SQL =
    'EXISTS (SELECT 1 FROM product_skus sku WHERE sku.product_id = product.id AND sku.status = 1)';
  // 批量并发改 SKU 时可能出现数据库死锁，这里做轻量重试降低失败率。
  private static readonly DEADLOCK_RETRY_MAX = 3;
  private static readonly DEADLOCK_RETRY_BASE_DELAY_MS = 80;

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductSku)
    private skuRepository: Repository<ProductSku>,
  ) {}

  // 获取”猜你喜欢“商品列表
  async getGuessLikeProducts(query: GuessQueryDto): Promise<ProductsList> {
    const { page = 1, pageSize = 10 } = query;
    const [list, total] = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .where(ProductsService.HAS_ON_SALE_SKU_SQL)
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

  // 商品列表查询：按商品ID/名称模糊筛选 + 单字段排序 + 分页返回
  async queryProductsList(
    query: SearchProductsQueryDto,
  ): Promise<ProductsList> {
    const {
      keyword,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'DESC',
    } = query;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .where(ProductsService.HAS_ON_SALE_SKU_SQL)
      .distinct(true);

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();
      // 仅按商品 id 或商品名称进行模糊搜索；id 是 bigint 需先转字符再 LIKE
      qb.andWhere(
        new Brackets((tagQb) => {
          tagQb
            .where('product.name LIKE :keyword', {
              keyword: `%${normalizedKeyword}%`,
            })
            .orWhere('CAST(product.id AS CHAR) LIKE :keyword', {
              keyword: `%${normalizedKeyword}%`,
            });
        }),
      );
    }

    // 排序只允许一个字段，按前端传入 sortBy 决定；未传时按商品 id 倒序
    const sortFieldMap: Record<
      NonNullable<SearchProductsQueryDto['sortBy']>,
      string
    > = {
      price: 'product.price',
      stock: 'product.totalStock',
      orderNum: 'product.salesCount',
    };
    if (sortBy) {
      qb.orderBy(sortFieldMap[sortBy], sortOrder);
    } else {
      qb.orderBy('product.id', 'DESC');
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

  // 后台商品列表查询：包含上架/下架商品，并额外返回 available 字段
  async queryAdminProductsList(
    query: SearchProductsQueryDto,
  ): Promise<ProductsList> {
    const {
      keyword,
      categoryId,
      available,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'DESC',
    } = query;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .distinct(true);

    // 后台列表支持按上/下架筛选，但上架定义由 SKU 聚合状态决定
    if (available !== undefined) {
      qb.andWhere(
        available === 1
          ? ProductsService.HAS_ON_SALE_SKU_SQL
          : `NOT ${ProductsService.HAS_ON_SALE_SKU_SQL}`,
      );
    }

    // 商品表的 category_id 即二级分类ID；前端传入后按该字段精确筛选
    if (categoryId?.trim()) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: categoryId.trim(),
      });
    }

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();
      qb.andWhere(
        new Brackets((tagQb) => {
          tagQb
            .where('product.name LIKE :keyword', {
              keyword: `%${normalizedKeyword}%`,
            })
            .orWhere('CAST(product.id AS CHAR) LIKE :keyword', {
              keyword: `%${normalizedKeyword}%`,
            });
        }),
      );
    }

    const sortFieldMap: Record<
      NonNullable<SearchProductsQueryDto['sortBy']>,
      string
    > = {
      price: 'product.price',
      stock: 'product.totalStock',
      orderNum: 'product.salesCount',
    };
    if (sortBy) {
      qb.orderBy(sortFieldMap[sortBy], sortOrder);
    } else {
      qb.orderBy('product.id', 'DESC');
    }

    const [list, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const productIds = list.map((item) => item.id);
    const onSaleByProductId = new Map<string, boolean>();
    if (productIds.length) {
      const rows = await this.skuRepository
        .createQueryBuilder('sku')
        .select('sku.product_id', 'productId')
        .addSelect(
          'MAX(CASE WHEN sku.status = 1 THEN 1 ELSE 0 END)',
          'hasOnSaleSku',
        )
        .where('sku.product_id IN (:...productIds)', { productIds })
        .groupBy('sku.product_id')
        .getRawMany<{ productId: string; hasOnSaleSku: string }>();

      for (const row of rows) {
        onSaleByProductId.set(row.productId, Number(row.hasOnSaleSku) === 1);
      }
    }

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
        // 商品总库存
        stock: item.totalStock || 0,
        // 后台可售标记按 SKU 聚合状态返回，不再直接依赖 product.status
        available: onSaleByProductId.get(item.id) || false,
      })),
    };
  }

  // 兼容旧方法名，内部转到新的商品列表查询实现
  async searchProducts(query: SearchProductsQueryDto): Promise<ProductsList> {
    return this.queryProductsList(query);
  }

  // 后台商品详情：根据商品ID返回全部SKU详情（不限制商品上架状态）
  async getAdminProductDetailById(productId: string): Promise<SkuItem[]> {
    const skus = await this.skuRepository.find({
      where: { productId },
      relations: [
        'product',
        'product.mainImages',
        'skuSpecs',
        'skuSpecs.spec',
        'skuSpecs.specValue',
      ],
      order: { id: 'ASC' },
    });

    return skus.map((sku) => ({
      id: sku.id,
      available: Number(sku.status) === 1,
      inventory: sku.stock,
      oldPrice: Number(sku.originalPrice),
      // SKU图缺失时兜底返回商品主图第一张
      picture:
        sku.imageUrl ||
        sku.product?.mainImages?.[0]?.imageUrl ||
        sku.product?.mainImage ||
        '',
      price: Number(sku.price),
      skuCode: sku.skuCode,
      specs: (sku.skuSpecs || []).map((row) => ({
        name: row.spec?.specName || '',
        valueName: row.specValue?.valueName || '',
      })),
    }));
  }

  // 后台SKU修改：前端字段映射为数据库字段后做局部更新
  async updateAdminSku(dto: UpdateSkuDto) {
    const { id, available, inventory, oldPrice, price } = dto;

    const updatePayload: Partial<ProductSku> = {};

    if (available !== undefined) {
      updatePayload.status = available ? 1 : 0;
    }
    if (inventory !== undefined) {
      updatePayload.stock = inventory;
    }
    if (oldPrice !== undefined) {
      updatePayload.originalPrice = String(oldPrice);
    }
    if (price !== undefined) {
      updatePayload.price = String(price);
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException(
        '至少传一个可修改字段：available、inventory、oldPrice、price',
      );
    }

    const sku = await this.skuRepository.findOne({ where: { id } });
    if (!sku) {
      throw new NotFoundException('SKU不存在');
    }

    await this.runWithDeadlockRetry(
      () => this.skuRepository.update({ id }, updatePayload),
      `updateAdminSku:${id}`,
    );
    return {
      id,
      success: true,
    };
  }

  // 获取多个商品数据
  async getProducts(data: any) {
    const { categoryId, pageSize, page } = data;
    const [list, total] = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .where('product.categoryId = :categoryId', { categoryId })
      .andWhere(ProductsService.HAS_ON_SALE_SKU_SQL)
      .orderBy('product.id', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize)
      .getManyAndCount();

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
    const product = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id = :id', { id })
      .andWhere(ProductsService.HAS_ON_SALE_SKU_SQL)
      .select([
        'product.id',
        'product.name',
        'product.description',
        'product.price',
        'product.originalPrice',
      ])
      .getOne();

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
            'status',
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
        // 详情里返回SKU可售标记：直接映射SKU status（1可售，0不可售）
        available: Number(sku.status) === 1,

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
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.mainImages', 'mainImage')
      .where('product.id IN (:...ids)', { ids })
      .andWhere(ProductsService.HAS_ON_SALE_SKU_SQL)
      .getMany();
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
      // 商品是否上架由 SKU 决定，因此下单前只需校验 SKU 自身状态
      if (Number(sku.status) !== 1) {
        throw new BadRequestException('未上架');
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
    // 库存扣减成功后，需要同步更新商品 totalStock
    // 注意：数据库触发器也会执行此操作，这里是防御性编程（当触发器失效时兜底）
    await this.syncProductStockBatch(items, manager);
  }

  /**
   * 批量同步商品总库存（防御性编程，应对触发器失效情况）
   * 当 SKU 库存发生变化时，同步更新所属商品的 totalStock
   */
  private async syncProductStockBatch(
    items: { skuId: string; count: number }[],
    manager?: EntityManager,
  ) {
    if (!items.length) return;

    const skus = await this.skuRepository.find({
      where: { id: In(items.map((i) => i.skuId)) },
      select: ['id', 'productId', 'stock'],
    });

    // 按 productId 分组，计算每个商品的总库存变化
    const productStockMap = new Map<string, number>();
    for (const sku of skus) {
      // 查找对应的 item 中 count（用于计算变化量）
      const item = items.find((i) => i.skuId === sku.id);
      if (item) {
        productStockMap.set(
          sku.productId,
          (productStockMap.get(sku.productId) || 0) - item.count,
        );
      }
    }

    // 批量更新商品 totalStock
    if (productStockMap.size > 0) {
      const repo = manager
        ? manager.getRepository(Product)
        : this.productRepository;

      for (const [productId, stockChange] of productStockMap.entries()) {
        if (stockChange !== 0) {
          await repo
            .createQueryBuilder()
            .update(Product)
            .set({
              totalStock: () => `total_stock + ${stockChange}`,
            })
            .where('id = :productId', { productId })
            .execute();
        }
      }
    }
  }

  /**
   * 重新计算单个商品的库存（修复数据不一致）
   * 根据所有 SKU 库存之和重算商品 totalStock
   * 用于数据修复：当发现库存不同步时调用此方法
   */
  async recalculateProductStock(productId: string): Promise<void> {
    const totalSkuStock = await this.skuRepository
      .createQueryBuilder('sku')
      .select('COALESCE(SUM(sku.stock), 0)', 'total')
      .where('sku.product_id = :productId', { productId })
      .getRawOne();

    const calculatedStock = Number(totalSkuStock?.total || 0);
    await this.productRepository.update(
      { id: productId },
      { totalStock: calculatedStock },
    );

    this.logger.debug(`商品 ${productId} 库存已重算，新值：${calculatedStock}`);
  }

  /**
   * 重新计算所有商品的库存（全量数据修复）
   * 遍历所有商品，根据 SKU 库存之和重算 totalStock
   */
  async recalculateAllProductsStock(): Promise<void> {
    const products = await this.productRepository.find();

    for (const product of products) {
      await this.recalculateProductStock(product.id);
    }

    this.logger.log(`已完成全量商品库存重算，共 ${products.length} 件商品`);
  }

  private isDeadlockError(error: unknown): boolean {
    const dbCode = (error as { code?: string } | null)?.code;
    const message = (error as { message?: string } | null)?.message || '';
    return (
      dbCode === 'ER_LOCK_DEADLOCK' ||
      dbCode === 'ER_LOCK_WAIT_TIMEOUT' ||
      message.includes('Deadlock found when trying to get lock') ||
      message.includes('Lock wait timeout exceeded')
    );
  }

  private async runWithDeadlockRetry<T>(
    operation: () => Promise<T>,
    operationTag: string,
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;
        if (
          !this.isDeadlockError(error) ||
          attempt > ProductsService.DEADLOCK_RETRY_MAX
        ) {
          throw error;
        }

        const delayMs = ProductsService.DEADLOCK_RETRY_BASE_DELAY_MS * attempt;
        this.logger.warn(
          `检测到死锁，准备重试 ${operationTag}（第 ${attempt} 次，${delayMs}ms 后）`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}
