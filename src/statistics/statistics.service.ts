import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/order/entities/order.entity';
import { User } from 'src/user/entities/user.entity';
import {
  StatisticsDailySalesResult,
  StatisticsSummaryResult,
} from './types/result';
import { Repository } from 'typeorm';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 统计接口统一按北京时间展示，避免服务器时区和数据库时区不一致时日期边界错位。
  private formatShanghaiDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';

    return `${year}-${month}-${day}`;
  }

  private getShanghaiDateStart(dateString: string): Date {
    return new Date(`${dateString}T00:00:00+08:00`);
  }

  private addShanghaiDays(dateString: string, days: number): string {
    const nextDate = new Date(`${dateString}T00:00:00+08:00`);
    nextDate.setDate(nextDate.getDate() + days);
    return this.formatShanghaiDate(nextDate);
  }

  private getSalesDateRange(days: number) {
    const today = this.formatShanghaiDate(new Date());
    const startDate = this.addShanghaiDays(today, -(days - 1));
    const endDate = this.addShanghaiDays(today, 1);

    return {
      startDate,
      endDate,
      startTime: `${startDate} 00:00:00`,
      endTime: `${endDate} 00:00:00`,
    };
  }

  private getMonthDateRange() {
    const today = this.formatShanghaiDate(new Date());
    const [year, month] = today.split('-');
    const startDate = `${year}-${month}-01`;
    const startDateObject = this.getShanghaiDateStart(startDate);
    const nextMonth = new Date(startDateObject);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = this.formatShanghaiDate(nextMonth);

    return {
      startDate,
      endDate,
      startTime: `${startDate} 00:00:00`,
      endTime: `${endDate} 00:00:00`,
    };
  }

  private async getOrderSummary(startTime: string, endTime: string) {
    const summary = await this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'orderCount')
      .addSelect(
        'COALESCE(SUM(CASE WHEN o.order_state IN (2,3,4,5) THEN o.pay_money ELSE 0 END), 0)',
        'salesAmount',
      )
      .where('o.create_time >= :startTime', { startTime })
      .andWhere('o.create_time < :endTime', { endTime })
      .getRawOne<{
        orderCount: string;
        salesAmount: string;
      }>();

    return {
      orderCount: Number(summary?.orderCount || 0),
      salesAmount: Number(summary?.salesAmount || 0),
    };
  }

  private async getNewUserCount(startTime: string, endTime: string) {
    const result = await this.userRepository
      .createQueryBuilder('u')
      .select('COUNT(u.id)', 'newUsers')
      .where('u.created_at >= :startTime', { startTime })
      .andWhere('u.created_at < :endTime', { endTime })
      .getRawOne<{ newUsers: string }>();

    return Number(result?.newUsers || 0);
  }

  // 最近30日趋势：返回每天的销售额和订单数，前端可直接画折线图。
  async getLast30DaysDailySales(): Promise<StatisticsDailySalesResult> {
    const { startTime, endTime, startDate } = this.getSalesDateRange(30);

    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.create_time, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect(
        'COALESCE(SUM(CASE WHEN o.order_state IN (2,3,4,5) THEN o.pay_money ELSE 0 END), 0)',
        'salesAmount',
      )
      .where('o.create_time >= :startTime', { startTime })
      .andWhere('o.create_time < :endTime', { endTime })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{
        date: string;
        orderCount: string;
        salesAmount: string;
      }>();

    const rowMap = new Map(rows.map((row) => [row.date, row] as const));
    const items: StatisticsDailySalesResult['items'] = [];

    for (let i = 0; i < 30; i += 1) {
      const date = this.addShanghaiDays(startDate, i);
      const row = rowMap.get(date);
      items.push({
        date,
        orderCount: Number(row?.orderCount || 0),
        salesAmount: Number(row?.salesAmount || 0),
      });
    }

    return { items };
  }

  // 当前月份汇总：订单数、销售额、新增用户数。
  async getCurrentMonthSummary(): Promise<StatisticsSummaryResult> {
    const { startTime, endTime } = this.getMonthDateRange();
    const [orderSummary, newUsers] = await Promise.all([
      this.getOrderSummary(startTime, endTime),
      this.getNewUserCount(startTime, endTime),
    ]);

    return {
      orderCount: orderSummary.orderCount,
      salesAmount: orderSummary.salesAmount,
      newUsers,
    };
  }

  // 今日汇总：订单数、销售额、新增用户数。
  async getTodaySummary(): Promise<StatisticsSummaryResult> {
    const today = this.formatShanghaiDate(new Date());
    const startTime = `${today} 00:00:00`;
    const nextDay = this.addShanghaiDays(today, 1);
    const endTime = `${nextDay} 00:00:00`;

    const [orderSummary, newUsers] = await Promise.all([
      this.getOrderSummary(startTime, endTime),
      this.getNewUserCount(startTime, endTime),
    ]);

    return {
      orderCount: orderSummary.orderCount,
      salesAmount: orderSummary.salesAmount,
      newUsers,
    };
  }
}
