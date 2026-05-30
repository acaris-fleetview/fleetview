import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FleetService } from './fleet.service';

@ApiTags('Fleet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('fleet')
export class FleetController {
  constructor(private fleet: FleetService) {}

  /* ── Vehicles ── */
  @Get('vehicles')
  @ApiOperation({ summary: 'Liste des véhicules' })
  getVehicles(@Request() req) { return this.fleet.findVehicles(req.user.orgId); }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string, @Request() req) { return this.fleet.findVehicle(id, req.user.orgId); }

  @Post('vehicles')
  @ApiOperation({ summary: 'Créer un véhicule' })
  createVehicle(@Body() dto: Record<string, unknown>, @Request() req) { return this.fleet.createVehicle(req.user.orgId, dto); }

  @Put('vehicles/:id')
  @ApiOperation({ summary: 'Modifier un véhicule' })
  updateVehicle(@Param('id') id: string, @Body() dto: Record<string, unknown>, @Request() req) { return this.fleet.updateVehicle(id, req.user.orgId, dto); }

  @Delete('vehicles/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un véhicule' })
  deleteVehicle(@Param('id') id: string, @Request() req) { return this.fleet.deleteVehicle(id, req.user.orgId); }

  @Post('vehicles/import')
  @ApiOperation({ summary: 'Import CSV véhicules (array JSON)' })
  importVehicles(@Body() body: { rows: Record<string, unknown>[] }, @Request() req) { return this.fleet.importVehicles(req.user.orgId, body.rows); }

  /* ── Drivers ── */
  @Get('drivers')
  @ApiOperation({ summary: 'Liste des conducteurs' })
  getDrivers(@Request() req) { return this.fleet.findDrivers(req.user.orgId); }

  @Get('drivers/:id')
  getDriver(@Param('id') id: string, @Request() req) { return this.fleet.findDriver(id, req.user.orgId); }

  @Post('drivers')
  @ApiOperation({ summary: 'Créer un conducteur' })
  createDriver(@Body() dto: Record<string, unknown>, @Request() req) { return this.fleet.createDriver(req.user.orgId, dto); }

  @Put('drivers/:id')
  @ApiOperation({ summary: 'Modifier un conducteur' })
  updateDriver(@Param('id') id: string, @Body() dto: Record<string, unknown>, @Request() req) { return this.fleet.updateDriver(id, req.user.orgId, dto); }

  @Delete('drivers/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Supprimer un conducteur' })
  deleteDriver(@Param('id') id: string, @Request() req) { return this.fleet.deleteDriver(id, req.user.orgId); }

  @Get('stats')
  getStats(@Request() req) { return this.fleet.fleetStats(req.user.orgId); }
}
