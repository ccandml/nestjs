import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, In } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { ClassifyData, ClassifyResult } from './types/result';
import { GoodsItems } from 'src/types/global';
import { CategoryNav } from './entities/category-nav.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CategoryNav)
    private readonly categoryNavRepository: Repository<CategoryNav>,
  ) {}

  // 按前端分类页结构返回：一级分类 -> 二级分类 -> 商品列表
  async getClassifyData(): Promise<ClassifyData[]> {
    // 一级可见分类（作为顶层）
    const levelOneCategories = await this.categoryRepository.find({
      where: { level: 1, isVisible: 1 },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    if (!levelOneCategories.length) {
      return [];
    }

    // 仅查询上述一级分类下的二级分类，避免全表扫描
    const levelOneIds = levelOneCategories.map((item) => item.id);
    const levelTwoCategories = await this.categoryRepository.find({
      where: {
        level: 2,
        isVisible: 1,
        parentId: In(levelOneIds),
      },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const levelTwoIds = levelTwoCategories.map((item) => item.id);
    // 查询二级分类下已上架商品，并按销量降序用于前端展示
    const products = levelTwoIds.length
      ? await this.productRepository.find({
          where: {
            categoryId: In(levelTwoIds),
            status: 1,
          },
          order: { salesCount: 'DESC', id: 'ASC' },
        })
      : [];

    // categoryId -> goods[]，先聚合再组装分类树，减少重复遍历
    const productMap = new Map<string, GoodsItems[]>();
    for (const product of products) {
      const bucket = productMap.get(product.categoryId) || [];
      bucket.push({
        id: product.id,
        name: product.name,
        desc: product.description || '',
        price: product.price,
        picture: product.mainImage || '',
        orderNum: product.salesCount || 0,
      });
      productMap.set(product.categoryId, bucket);
    }

    // parentId -> children[]；同时缓存一级分类名称给二级分类的 parentName
    const childrenMap = new Map<string, ClassifyData['children']>();
    const categoryNameMap = new Map(
      levelOneCategories.map((item) => [item.id, item.name]),
    );

    for (const child of levelTwoCategories) {
      const goods = productMap.get(child.id) || [];
      const childItem = {
        id: child.id,
        name: child.name,
        picture: child.icon || goods[0]?.picture || '',
        parentId: child.parentId,
        parentName: categoryNameMap.get(child.parentId) || null,
        goods,
      };
      const bucket = childrenMap.get(child.parentId) || [];
      bucket.push(childItem);
      childrenMap.set(child.parentId, bucket);
    }

    return levelOneCategories.map((item) => {
      const children = childrenMap.get(item.id) || [];
      // 轮播图优先使用子分类商品图，最多返回 6 张
      const imageBanners = children
        .flatMap((child) => child.goods.map((goods) => goods.picture))
        .filter((picture) => !!picture)
        .slice(0, 6);

      return {
        id: item.id,
        name: item.name,
        // 一级分类图标缺失时，兜底使用轮播首图
        picture: item.icon || imageBanners[0] || '',
        imageBanners,
        children,
      };
    });
  }

  // 返回精简分类结构：一级分类 + 二级分类名称，用于轻量级分类列表场景
  async getClassifyResult(): Promise<ClassifyResult[]> {
    const categories = await this.categoryRepository.find({
      where: { isVisible: 1 },
      order: { level: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });

    if (!categories.length) {
      return [];
    }

    const levelOneCategories = categories.filter((item) => item.level === 1);
    const levelTwoCategories = categories.filter((item) => item.level === 2);

    // 预先按 parentId 建立二级分类索引，避免在一级循环中重复全量 filter
    const childrenMap = new Map<string, ClassifyResult['children']>();
    for (const category of levelTwoCategories) {
      const currentChildren = childrenMap.get(category.parentId) || [];
      currentChildren.push({
        id: category.id,
        name: category.name,
      });
      childrenMap.set(category.parentId, currentChildren);
    }

    return levelOneCategories.map((category) => ({
      id: category.id,
      name: category.name,
      children: childrenMap.get(category.id) || [],
    }));
  }

  // 获取分类导航数据
  async getCategoryNavs(): Promise<CategoryNav[]> {
    return this.categoryNavRepository.find();
  }
}
