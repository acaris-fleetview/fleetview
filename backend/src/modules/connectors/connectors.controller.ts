import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebfleetService } from './webfleet.service';
import { TankyouService } from './tankyou.service';

@ApiTags('Connectors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('connectors')
export class ConnectorsController {
  constructor(
    private webfleet: WebfleetService,
    private tankyou: TankyouService,
  ) {}

  @Get('webfleet/vehicles')
  getWebfleetVehicles() { return this.webfleet.fetchVehicles(); }

  @Get('webfleet/positions')
  getWebfleetPositions() { return this.webfleet.fetchPositions(); }

  @Post('webfleet/sync')
  syncWebfleet() { return this.webfleet.syncPositions(); }
}
