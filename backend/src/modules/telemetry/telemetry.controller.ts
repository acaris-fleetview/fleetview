import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';

@ApiTags('Telemetry')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('telemetry')
export class TelemetryController {
  constructor(private telemetry: TelemetryService) {}

  @Get('trips/:vehicleId')
  getTrips(@Param('vehicleId') vehicleId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.telemetry.findTripsByVehicle(vehicleId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get('kpi')
  getKpi(@Request() req, @Query('days') days?: string) {
    return this.telemetry.kpiSummary(req.user.orgId, days ? parseInt(days) : 30);
  }
}
