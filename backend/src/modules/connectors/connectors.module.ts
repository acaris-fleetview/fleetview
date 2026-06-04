import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebfleetService } from './webfleet.service';
import { TankyouService } from './tankyou.service';
import { Mts1Service } from './mts1.service';
import { ConnectorsController } from './connectors.controller';

@Module({
  imports: [HttpModule],
  controllers: [ConnectorsController],
  providers: [WebfleetService, TankyouService, Mts1Service],
  exports: [WebfleetService, TankyouService, Mts1Service],
})
export class ConnectorsModule {}
