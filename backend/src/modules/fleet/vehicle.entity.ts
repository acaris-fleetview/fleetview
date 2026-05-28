import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'org_id' }) orgId: string;
  @Column({ name: 'site_id', nullable: true }) siteId: string;
  @Column() registration: string;
  @Column({ nullable: true }) brand: string;
  @Column({ nullable: true }) model: string;
  @Column({ nullable: true }) year: number;
  @Column({ name: 'fuel_type', nullable: true }) fuelType: string;
  @Column({ name: 'tank_capacity_l', type: 'numeric', nullable: true }) tankCapacityL: number;
  @Column({ default: 'active' }) status: string;
  @Column({ name: 'odometer_km', type: 'numeric', default: 0 }) odometerKm: number;
  @Column({ name: 'webfleet_object_uid', nullable: true }) webfleetObjectUid: string;
  @Column({ name: 'commissioned_at', type: 'date', nullable: true }) commissionedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
