import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WebfleetService } from './webfleet.service';
import { TankyouService } from './tankyou.service';
import { Mts1Service } from './mts1.service';

@ApiTags('Connectors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('connectors')
export class ConnectorsController {
  constructor(
    private webfleet: WebfleetService,
    private tankyou: TankyouService,
    private mts1: Mts1Service,
  ) {}

  @Get('webfleet/vehicles')
  getWebfleetVehicles() { return this.webfleet.fetchVehicles(); }

  @Get('webfleet/positions')
  getWebfleetPositions() { return this.webfleet.fetchPosition