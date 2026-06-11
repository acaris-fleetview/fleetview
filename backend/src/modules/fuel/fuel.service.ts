import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelTransaction } from './fuel-transaction.entity';
import { FraudAlert } from './fraud-alert.entity';

interface TxFilters {
  from?: Date;
  to?: Date;
  vehicleId?: string;
  provider?: string;
}

@Injectable()
export class FuelService {
  constructor(
    @InjectRepository(FuelTransaction) private transactions: Repository<FuelTransaction>,
    @InjectRepository(FraudAlert) private fraudAlerts: Repository<FraudAlert>,
  ) {}

  private scopedTxQb(orgId: string) {
    return this.transactions
      .createQueryBuilder('ft')
      .innerJoin('vehicles', 'v', 'v.id = ft.vehicle_id')
      .where('v.org_id = :orgId', { orgId });
  }

  findTransactions(orgId: string, filters: TxFilters = {}) {
    const { from, to, vehicleId, provider } = filters;
    const qb = this.scopedTxQb(orgId).orderBy('ft.transacted_at', 'DESC');
    if (vehicleId) qb.andWhere('ft.vehicle_id = :vehicleId', { vehicleId });
    if (provider) qb.andWhere('ft.provider = :provider', { provider });
    if (from) qb.andWhere('ft.transacted_at >= :from', { from });
    if (to) qb.andWhere('ft.transacted_at <= :to', { to });
    return qb.limit(200).getMany();
  }

  findFraudAlerts(orgId: string, status?: string) {
    const qb = this.fraudAlerts
      .createQueryBuilder('fa')
      .innerJoin('fuel_transactions', 'ft', 'ft.id = fa.transaction_id')
      .innerJoin('vehicles', 'v', 'v.id = ft.vehicle_id')
      .where('v.org_id = :orgId', { orgId })
      .orderBy('fa.created_at', 'DESC');
    if (status) qb.andWhere('fa.status = :status', { status });
    return qb.getMany();
  }

  async lastImportByProvider(orgId: string) {
    const rows = await this.scopedTxQb(orgId)
      .select('ft.provider', 'provider')
      .addSelect('MAX(ft.created_at)', 'lastDate')
      .addSelect('COUNT(ft.id)', 'count')
      .groupBy('ft.provider')
      .orderBy('MAX(ft.created_at)', 'DESC')
      .getRawMany();
    return rows.map(r => ({
      provider: r.provider,
      lastDate: r.lastDate,
      count: parseInt(r.count),
    }));
  }

  async fuelKpi(orgId: string, days: number = 30) {
    const from = days >= 9999
      ? new Date('2000-01-01')
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.scopedTxQb(orgId)
      .andWhere('ft.transacted_at >= :from', { from })
      .select('SUM(ft.total_eur)', 'totalCost')
      .addSelect('SUM(ft.volume_l)', 'totalVolume')
      .addSelect('COUNT(ft.id)', 'txCount')
      .addSelect('AVG(ft.unit_price_eur)', 'avgPrice')
      .getRawOne();

    const openFraudAlerts = await this.fraudAlerts
      .createQueryBuilder('fa')
      .innerJoin('fuel_transactions', 'ft', 'ft.id = fa.transaction_id')
      .innerJoin('vehicles', 'v', 'v.id = ft.vehicle_id')
      .where('v.org_id = :orgId', { orgId })
      .andWhere('fa.status = :status', { status: 'open' })
      .getCount();

    return {
      totalCostEur:     parseFloat(result.totalCost)   || 0,
      totalVolumeL:     parseFloat(result.totalVolume) || 0,
      transactionCount: parseInt(result.txCount)       || 0,
      avgPriceEur:      parseFloat(result.avgPrice)    || 0,
      openFraudAlerts,
    };
  }
}
