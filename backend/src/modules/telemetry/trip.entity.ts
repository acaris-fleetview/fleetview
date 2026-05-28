import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'vehicle_id' }) vehicleId: string;
  @Column({ name: 'driver_id', nullable: true }) driverId: string;
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt: Date;
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true }) endedAt: Date;
  @Column({ name: 'distance_km', type: 'numeric', nullable: true }) distanceKm: number;
  @Column({ name: 'duration_min', nullable: true }) durationMin: number;
  @Column({ name: 'fuel_l', type: 'numeric', nullable: true }) fuelL: number;
  @Column({ name: 'co2_kg', type: 'numeric', nullable: true }) co2Kg: number;
  @Column({ name: 'driving_score', type: 'numeric', nullable: true }) drivingScore: number;
  @Column({ name: 'start_address', nullable: true }) startAddress: string;
  @Column({ name: 'end_address', nullable: true }) endAddress: string;
  @Column({ default: 'webfleet' }) source: string;
  @Column({ name: 'external_id', nullable: true, unique: true }) externalId: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
