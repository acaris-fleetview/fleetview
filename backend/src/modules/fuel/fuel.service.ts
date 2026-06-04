import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelTransaction } from './fuel-transaction.entity';
import { FraudAlert } from './fraud-alert.entity';

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelTransaction) private transactions: Repository<FuelTransaction>,
    @InjectRepository(FraudAlert) private fraudAlerts: Repository<FraudAlert>,
  ) {}

  findTransactions(from?: Date, to?: Date, vehicleId?: string) {
    const qb = this.transactions.createQueryBuilder('ft').orderBy('ft.transacted_at', 'DESC');
    if (vehicleId) qb.andWhere('ft.vehicle_id = :vehicleId', { vehicleId });
    if (from) qb.andWhere('ft.transacted_at >= :from', { from });
    if (to) qb.andWhere('ft.transacted_at <= :to', { to });
    return qb.orderBy('t.transactedAt', 'DESC').getMany();
  }

  findFraudAlerts(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    return this.fraudAlerts.find({ where, order: { createdAt: 'DESC' } });
  }

  async fuelKpi(days: number = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.transactions.createQueryBuilder('ft')
      .select('SUM(ft.total_eur)', 'totalCost')
      .addSelect('SUM(ft.volume_l)', 'totalVolume')
      .addSelect('COUNT(ft.id)', 'txCount')
      .addSelect('AVG(ft.unit_price_eur)', 'avgPrice')
      .where('ft.transacted_at >= :from', { from })
      .getRawOne();
    const fraudCount = await this.fraudAlerts.count({ where: { status: 'open' } });
    return {
      totalCostEur: parseFloat(result.totalCost) || 0,
      totalVolumeL: parseFloat(result.totalVolume) || 0,
      transactionCount: parseInt(result.txCount) || 0,
      avgPriceEur: parseFloat(result.avgPrice) || 0,
      openFraudAlerts: fraudCount,
    };
  }
}
