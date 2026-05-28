import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { Driver } from './driver.entity';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Driver) private drivers: Repository<Driver>,
  ) {}

  findVehicles(orgId: string) {
    return this.vehicles.find({ where: { orgId } });
  }

  findVehicle(id: string, orgId: string) {
    return this.vehicles.findOne({ where: { id, orgId } });
  }

  findDrivers(orgId: string) {
    return this.drivers.find({ where: { orgId } });
  }

  async fleetStats(orgId: string) {
    const vehicles = await this.vehicles.find({ where: { orgId } });
    const active = vehicles.filter(v => v.status === 'active').length;
    const inactive = vehicles.filter(v => v.status === 'inactive').length;
    return { total: vehicles.length, active, inactive, archived: vehicles.length - active - inactive };
  }
}
