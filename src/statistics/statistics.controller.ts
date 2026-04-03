import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import {
  StatisticsDailySalesResult,
  StatisticsSummaryResult,
} from './types/result';
import { Roles } from 'src/decorators/roles';
import { RolesDecoratorEnum } from 'src/enum/roles.decorator.enum';
import { JwtGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Roles(RolesDecoratorEnum.Admin)
@UseGuards(JwtGuard, RolesGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  // 最近30日趋势：每日销售额与订单数。
  @Get('daily-sales')
  getLast30DaysDailySales(): Promise<StatisticsDailySalesResult> {
    return this.statisticsService.getLast30DaysDailySales();
  }

  // 当前月份汇总：订单数、销售额、新增用户。
  @Get('month-summary')
  getCurrentMonthSummary(): Promise<StatisticsSummaryResult> {
    return this.statisticsService.getCurrentMonthSummary();
  }

  // 今日汇总：订单数、销售额、新增用户。
  @Get('today-summary')
  getTodaySummary(): Promise<StatisticsSummaryResult> {
    return this.statisticsService.getTodaySummary();
  }
}
