import { Injectable, NotFoundException } from '@nestjs/common';
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

  /* ── Vehicles ── */
  findVehicles(orgId: string) {
    return this.vehicles.find({ where: { orgId }, order: { registration: 'ASC' } });
  }

  async findVehicle(id: string, orgId: string) {
    const v = await this.vehicles.findOne({ where: { id, orgId } });
    if (!v) throw new NotFoundException('Véhicule introuvable');
    return v;
  }

  createVehicle(orgId: string, dto: Partial<Vehicle>) {
    const v = this.vehicles.create({ ...dto, orgId });
    return this.vehicles.save(v);
  }

  async updateVehicle(id: string, orgId: string, dto: Partial<Vehicle>) {
    await this.findVehicle(id, orgId);
    await this.vehicles.update({ id, orgId }, dto);
    return this.findVehicle(id, orgId);
  }

  async deleteVehicle(id: string, orgId: string) {
    await this.findVehicle(id, orgId);
    await this.vehicles.delete({ id, orgId });
    return { deleted: true };
  }

  async importVehicles(orgId: string, rows: Partial<Vehicle>[]) {
    const created: Vehicle[] = [];
    for (const row of rows) {
      const existing = await this.vehicles.findOne({ where: { registration: row.registration, orgId } });
      if (existing) {
        await this.vehicles.update({ id: existing.id }, { ...row, orgId });
        created.push({ ...existing, ...row } as Vehicle);
      } else {
        created.push(await this.createVehicle(orgId, row));
      }
    }
    return { imported: created.length };
  }

  /* ── Drivers ── */
  findDrivers(orgId: string) {
    return this.drivers.find({ where: { orgId }, order: { lastName: 'ASC' } });
  }

  async findDriver(id: string, orgId: string) {
    const d = await this.drivers.findOne({ where: { id, orgId } });
    if (!d) throw new NotFoundException('Conducteur introuvable');
    return d;
  }

  createDriver(orgId: string, dto: Partial<Driver>) {
    const d = this.drivers.create({ ...dto, orgId });
    return this.drivers.save(d);
  }

  async updateDriver(id: string, orgId: string, dto: Partial<Driver>) {
    await this.findDriver(id, orgId);
    await this.drivers.update({ id, orgId }, dto);
    return this.findDriver(id, orgId);
  }

  async deleteDriver(id: string, orgId: string) {
    await this.findDriver(id, orgId);
    await this.drivers.delete({ id, orgId });
    return { deleted: true };
  }

  /* ── Stats ── */
  async fleetStats(orgId: string) {
    const vehicles = await this.vehicles.find({ where: { orgId } });
    const active = vehicles.filter(v => v.status === 'active').length;
    const inactive = vehicles.filter(v => v.status === 'inactive').length;
    return { total: vehicles.length, active, inactive, archived: vehicles.length - active - inactive };
  }
}
