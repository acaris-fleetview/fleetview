import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from './trip.entity';

@Injectable()
export class TelemetryService {
  constructor(@InjectRepository(Trip) private trips: Repository<Trip>) {}

  findTripsByVehicle(vehicleId: string, from?: Date, to?: Date) {
    const qb = this.trips.createQueryBuilder('t')
      .where('t.vehicle_id = :vehicleId', { vehicleId })
      .orderBy('t.started_at', 'DESC');
    if (from) qb.andWhere('t.started_at >= :from', { from });
    if (to) qb.andWhere('t.started_at <= :to', { to });
    return qb.getMany();
  }

  async kpiSummary(orgId: string, days: number = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.trips.createQueryBuilder('t')
      .select('SUM(t.distance_km)', 'totalKm')
      .addSelect('SUM(t.fuel_l)', 'totalFuelL')
      .addSelect('SUM(t.co2_kg)', 'totalCo2Kg')
      .addSelect('COUNT(t.id)', 'tripCount')
      .addSelect('AVG(t.driving_score)', 'avgDrivingScore')
      .where('t.started_at >= :from', { from })
      .getRawOne();
    return {
      totalKm: parseFloat(result.totalKm) || 0,
      totalFuelL: parseFloat(result.totalFuelL) || 0,
      totalCo2Kg: parseFloat(result.totalCo2Kg) || 0,
      tripCount: parseInt(result.tripCount) || 0,
      avgDrivingScore: parseFloat(result.avgDrivingScore) || 0,
    };
  }
}
