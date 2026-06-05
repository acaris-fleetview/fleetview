import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  getTransactions(@Query('from') from?: string, @Query('to') to?: string, @Query('vehicleId') vehicleId?: string) {
    return this.fuel.findTransactions(from ? new Date(from) : undefined, to ? new Date(to) : undefined, vehicleId);
  }

  @Get('fraud-alerts')
  getFraudAlerts(@Query('status') status?: string) {
    return this.fuel.findFraudAlerts(status);
  }

  @Get('kpi')
  getKpi(@Query('days') days?: string) {
    return this.fuel.fuelKpi(days ? parseInt(days) : 30);
  }

  @Get('last-imports')
  getLastImports() {
    return this.fuel.lastImportByProvider();
  }

}