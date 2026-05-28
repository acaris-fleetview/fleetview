import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FleetService } from './fleet.service';

@ApiTags('Fleet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fleet')
export class FleetController {
  constructor(private fleet: FleetService) {}

  @Get('vehicles')
  @ApiOperation({ summary: 'Liste des véhicules' })
  getVehicles(@Request() req) {
    return this.fleet.findVehicles(req.user.orgId);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string, @Request() req) {
    return this.fleet.findVehicle(id, req.user.orgId);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Liste des conducteurs' })
  getDrivers(@Request() req) {
    return this.fleet.findDrivers(req.user.orgId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de la flotte' })
  getStats(@Request() req) {
    return this.fleet.fleetStats(req.user.orgId);
  }
}
