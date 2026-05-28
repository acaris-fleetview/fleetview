import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import { FuelTransaction } from './fuel-transaction.entity';
import { FraudAlert } from './fraud-alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FuelTransaction, FraudAlert])],
  controllers: [FuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
