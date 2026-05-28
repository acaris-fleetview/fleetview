import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { Vehicle } from './vehicle.entity';
import { Driver } from './driver.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Driver])],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}
