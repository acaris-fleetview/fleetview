import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { Trip } from './trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip])],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
