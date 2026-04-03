import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { Roles } from 'src/roles/roles.entity';
import {
  AdminUserDetailResult,
  AdminUserListResult,
  ProfileDetail,
} from './types/result';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminQueryUserDto } from './dto/admin-query-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { Order } from 'src/order/entities/order.entity';
import { UserAddress } from 'src/user-address/entities/user-address.entity';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Roles)
    private rolesRepository: Repository<Roles>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(UserAddress)
    private addressRepository: Repository<UserAddress>,
  ) {}

  // 格式化时间：统一返回 YYYY-MM-DD HH:mm:ss
  private formatDateTime(dateValue: unknown): string {
    if (!dateValue) return '';
    const d = new Date(dateValue as any);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  }

  // 按用户ID批量查询角色名，避免在用户列表聚合查询里引入角色关联导致统计重复。
  private async getRoleNamesByUserIds(
    userIds: number[],
  ): Promise<Map<number, string[]>> {
    const roleMap = new Map<number, string[]>();
    const uniqueUserIds = Array.from(new Set(userIds)).filter((id) => id > 0);

    if (uniqueUserIds.length === 0) {
      return roleMap;
    }

    const roleRows = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.roles', 'r')
      .select(['u.id AS userId', 'r.name AS roleName'])
      .where('u.id IN (:...userIds)', { userIds: uniqueUserIds })
      .getRawMany<{
        userId: string;
        roleName: string | null;
      }>();

    for (const row of roleRows) {
      const userId = Number(row.userId);
      if (!Number.isFinite(userId)) {
        continue;
      }

      const roleName = row.roleName?.trim();
      if (!roleName) {
        continue;
      }

      const current = roleMap.get(userId) || [];
      if (!current.includes(roleName)) {
        current.push(roleName);
        roleMap.set(userId, current);
      }
    }

    return roleMap;
  }

  // 管理端用户列表：关键词筛选 + 单字段排序 + 订单聚合
  async queryAdminUserList(
    query: AdminQueryUserDto,
  ): Promise<AdminUserListResult> {
    const {
      keyword,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'DESC',
    } = query;

    const totalQb = this.userRepository.createQueryBuilder('u');

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();
      totalQb.where(
        '(u.username LIKE :keyword OR CAST(u.id AS CHAR) LIKE :keyword)',
        {
          keyword: `%${normalizedKeyword}%`,
        },
      );
    }

    const total = await totalQb.getCount();

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin('orders', 'o', 'o.user_id = u.id')
      .select([
        'u.id AS id',
        'u.avatar AS avatar',
        'u.username AS username',
        'u.gender AS gender',
        'u.created_at AS createTime',
        'COUNT(o.id) AS orderCount',
        'COALESCE(SUM(CASE WHEN o.order_state IN (2,3,4,5) THEN o.pay_money ELSE 0 END), 0) AS totalPayMoney',
      ])
      .groupBy('u.id')
      .addGroupBy('u.avatar')
      .addGroupBy('u.username')
      .addGroupBy('u.gender')
      .addGroupBy('u.created_at');

    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();
      qb.where(
        '(u.username LIKE :keyword OR CAST(u.id AS CHAR) LIKE :keyword)',
        {
          keyword: `%${normalizedKeyword}%`,
        },
      );
    }

    const sortFieldMap: Record<
      NonNullable<AdminQueryUserDto['sortBy']>,
      string
    > = {
      createTime: 'u.created_at',
      orderCount: 'orderCount',
      totalPayMoney: 'totalPayMoney',
    };

    if (sortBy) {
      qb.orderBy(sortFieldMap[sortBy], sortOrder);
    } else {
      qb.orderBy('u.created_at', 'DESC');
    }

    const rows = await qb
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<{
        id: string;
        avatar: string | null;
        username: string;
        gender: string | null;
        createTime: string | null;
        orderCount: string;
        totalPayMoney: string;
      }>();

    const roleNameMap = await this.getRoleNamesByUserIds(
      rows.map((row) => Number(row.id)),
    );

    return {
      counts: total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      items: rows.map((row) => ({
        id: Number(row.id),
        avatar: row.avatar || '',
        username: row.username || '',
        gender: row.gender || '未知',
        createTime: this.formatDateTime(row.createTime),
        roleNames: roleNameMap.get(Number(row.id)) || [],
        orderCount: Number(row.orderCount || 0),
        totalPayMoney: Number(row.totalPayMoney || 0),
      })),
    };
  }

  // 管理端用户详情：基础信息 + 统计 + 收货地址 + 最近订单
  async queryAdminUserDetail(userId: string): Promise<AdminUserDetailResult> {
    const user = await this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id AS id',
        'u.avatar AS avatar',
        'u.username AS username',
        'u.gender AS gender',
        'u.created_at AS createTime',
      ])
      .where('u.id = :userId', { userId })
      .getRawOne<{
        id: string;
        avatar: string | null;
        username: string;
        gender: string | null;
        createTime: string | null;
      }>();

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const roleNameMap = await this.getRoleNamesByUserIds([Number(user.id)]);
    const roleNames = roleNameMap.get(Number(user.id)) || [];

    // 聚合统计：订单总数、累计消费、最近下单时间
    const stats = await this.orderRepository
      .createQueryBuilder('o')
      .select([
        'COUNT(o.id) AS orderCount',
        'COALESCE(SUM(CASE WHEN o.order_state IN (2,3,4,5) THEN o.pay_money ELSE 0 END), 0) AS totalPayMoney',
        'MAX(o.create_time) AS latestOrderTime',
      ])
      .where('o.user_id = :userId', { userId })
      .getRawOne<{
        orderCount: string;
        totalPayMoney: string;
        latestOrderTime: string | null;
      }>();

    const addresses = await this.addressRepository
      .createQueryBuilder('a')
      .select([
        'a.receiver AS receiver',
        'a.contact AS mobile',
        'a.full_location AS fullLocation',
        'a.address AS address',
        'a.is_default AS isDefault',
      ])
      .where('a.user_id = :userId', { userId })
      .orderBy('a.is_default', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .getRawMany<{
        receiver: string;
        mobile: string;
        fullLocation: string | null;
        address: string | null;
        isDefault: number | string;
      }>();

    // 最近订单列表：按下单时间倒序取最近10条
    const recentOrders = await this.orderRepository
      .createQueryBuilder('o')
      .select([
        'o.id AS id',
        'o.create_time AS createTime',
        'o.pay_money AS payMoney',
        'o.order_state AS orderState',
      ])
      .where('o.user_id = :userId', { userId })
      .orderBy('o.create_time', 'DESC')
      .limit(10)
      .getRawMany<{
        id: string;
        createTime: string | null;
        payMoney: string;
        orderState: string;
      }>();

    return {
      profile: {
        id: Number(user.id),
        avatar: user.avatar || '',
        username: user.username || '',
        gender: user.gender || '未知',
        createTime: this.formatDateTime(user.createTime),
        roleNames,
      },
      stats: {
        orderCount: Number(stats?.orderCount || 0),
        totalPayMoney: Number(stats?.totalPayMoney || 0),
        latestOrderTime: this.formatDateTime(stats?.latestOrderTime),
      },
      addresses: addresses.map((addr) => ({
        receiver: addr.receiver || '',
        mobile: addr.mobile || '',
        fullAddress: [addr.fullLocation, addr.address]
          .filter((part) => !!part && part.trim().length > 0)
          .join(' ')
          .trim(),
        isDefault: Number(addr.isDefault) === 1,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        createTime: this.formatDateTime(order.createTime),
        payMoney: Number(order.payMoney || 0),
        orderState: Number(order.orderState),
      })),
    };
  }

  // 根据用户ID获取用户信息（从token中获取userId调用）
  async getUserById(userId: number): Promise<ProfileDetail> {
    const user = await this.userRepository.findOne({
      select: {
        id: true,
        username: true,
        gender: true,
        birthday: true,
        avatar: true,
        fullLocation: true,
        profession: true,
      },
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      gender: user.gender,
      birthday: user.birthday,
      avatar: user.avatar,
      fullLocation: user.fullLocation,
      profession: user.profession,
    };
  }

  // JWT,权限守卫使用：查询用户并携带角色
  async findUsersWithRoles(dto: { id?: number | string; username?: string }) {
    const where: Record<string, unknown> = {};

    if (dto.id !== undefined && dto.id !== null) {
      where.id = dto.id;
    }
    if (dto.username) {
      where.username = dto.username;
    }

    return this.userRepository.findOne({
      select: {
        id: true,
        username: true,
        password: true,
        roles: {
          id: true,
          name: true,
        },
        avatar: true,
      },
      where,
      relations: ['roles'],
    });
  }

  // 新增用户
  async addUser(user: Partial<User>) {
    const userTemp = this.userRepository.create(user); // 创建对象，并且自动补充没有的字段

    // 用户创建时间不走数据库默认时间，直接在应用层落库，避免受 MySQL 会话时区影响。
    const now = new Date();
    userTemp.createdAt = now;
    userTemp.updatedAt = now;

    // 只关联已存在角色，不在创建用户时新建角色
    const roleIdsFromPayload = Array.isArray(user.roles)
      ? user.roles
          .map((role) =>
            typeof role === 'number' ? role : (role as Roles | undefined)?.id,
          )
          .filter((id): id is number => Number.isInteger(id) && id > 0)
      : [];

    // 未传角色时默认关联“普通用户”角色（id=3）
    const roleIds =
      roleIdsFromPayload.length > 0
        ? Array.from(new Set(roleIdsFromPayload))
        : [3];

    const roles = await this.rolesRepository.find({
      where: { id: In(roleIds) },
    });

    // 强校验：所有角色都必须存在，避免出现无效关联
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('角色不存在');
    }

    userTemp.roles = roles;

    // 对密码进行加密存储，确保数据库里只保存哈希值。
    userTemp.password = await argon2.hash(user.password);
    const saveUser = await this.userRepository.save(userTemp); // 操作数据库，插入or更新 数据
    return saveUser;
  }

  // 管理端新增用户：超级管理员可创建管理员/普通用户，管理员只能创建普通用户。
  async addUserByAdmin(
    creatorUserId: number,
    dto: AdminCreateUserDto,
  ): Promise<{
    id: number;
    username: string;
    avatar: string;
    gender?: string;
    birthday?: string;
    fullLocation?: string;
    profession?: string;
    roleNames: string[];
  }> {
    const creator = await this.findUsersWithRoles({ id: creatorUserId });
    if (!creator) {
      throw new NotFoundException('创建者不存在');
    }

    const creatorRoleIds = creator.roles?.map((role) => role.id) || [];
    let allowedRoleIds: RolesDecoratorEnum[] = [];
    if (creatorRoleIds.includes(RolesDecoratorEnum.SuperAdmin)) {
      allowedRoleIds = [RolesDecoratorEnum.Admin, RolesDecoratorEnum.User];
    } else if (creatorRoleIds.includes(RolesDecoratorEnum.Admin)) {
      allowedRoleIds = [RolesDecoratorEnum.User];
    }

    if (allowedRoleIds.length === 0) {
      throw new BadRequestException('当前用户无权限创建账号');
    }

    const targetRoleId = dto.roleId ?? RolesDecoratorEnum.User;
    if (!allowedRoleIds.includes(targetRoleId)) {
      throw new BadRequestException('当前用户无权限创建该角色账号');
    }

    const createdUser = await this.addUser({
      username: dto.username,
      password: dto.password,
      gender: dto.gender,
      birthday: dto.birthday,
      avatar: dto.avatar,
      fullLocation: dto.fullLocation,
      profession: dto.profession,
      roles: [{ id: targetRoleId } as Roles],
    });

    return {
      id: createdUser.id,
      username: createdUser.username,
      avatar: createdUser.avatar || '',
      gender: createdUser.gender,
      birthday: createdUser.birthday,
      fullLocation: createdUser.fullLocation,
      profession: createdUser.profession,
      roleNames: createdUser.roles?.map((role) => role.name) || [],
    };
  }

  // 修改用户信息：前端传入的新字段覆盖数据库中的旧字段
  async updateUserById(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<ProfileDetail> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updatableKeys: Array<keyof UpdateUserDto> = [
      'username',
      'gender',
      'birthday',
      'avatar',
      'fullLocation',
      'profession',
    ];

    for (const key of updatableKeys) {
      if (dto[key] !== undefined) {
        (user as any)[key] = dto[key];
      }
    }

    await this.userRepository.save(user);
    return this.getUserById(userId);
  }

  // 管理端删除用户：按用户ID硬删除。
  async deleteUserById(userId: string) {
    const normalizedId = Number(userId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
      throw new BadRequestException('用户ID不合法');
    }

    const user = await this.userRepository.findOne({
      where: { id: normalizedId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepository.remove(user);

    return {
      success: true,
    };
  }
}
