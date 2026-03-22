import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menus } from './entities/menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Menus])],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
