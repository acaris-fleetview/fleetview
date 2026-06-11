import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FuelService } from './fuel.service';

@ApiTags('Fuel')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fuel')
export class FuelController {
  constructor(private fuel: FuelService) {}

  @Get('transactions')
  getTransactions(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('provider') provider?: string,
  ) {
    return this.fuel.findTransactions(req.user.orgId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      vehicleId,
      provider,
    });
  }

  @Get('fraud-alerts')
  getFraudAlerts(@Request() req, @Query('status') status?: string) {
    return this.fuel.findFraudAlerts(req.user.orgId, status);
  }

  @Get('kpi')
  getKpi(@Request() req, @Query('days') days?: string) {
    return this.fuel.fuelKpi(req.user.orgId, days ? parseInt(days) : 30);
  }
}
