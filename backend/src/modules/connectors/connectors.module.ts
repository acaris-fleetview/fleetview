import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebfleetService } from './webfleet.service';
import { TankyouService } from './tankyou.service';
import { ConnectorsController } from './connectors.controller';

@Module({
  imports: [HttpModule],
  controllers: [ConnectorsController],
  providers: [WebfleetService, TankyouService],
  exports: [WebfleetService, TankyouService],
})
export class ConnectorsModule {}
