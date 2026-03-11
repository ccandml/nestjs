import { Controller, Get, Param } from '@nestjs/common';
import { RangeService } from './range.service';

@Controller('range')
export class RangeController {
  constructor(private rangeService: RangeService) {}

  @Get(':num')
  getRange(@Param('num') num: string) {
    return this.rangeService.getRange(Number(num));
  }
}
