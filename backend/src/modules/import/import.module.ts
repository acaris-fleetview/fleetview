import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FuelTransaction } from '../fuel/fuel-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FuelTransaction])],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
