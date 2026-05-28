import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fuel_transactions')
export class FuelTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'vehicle_id', nullable: true }) vehicleId: string;
  @Column({ name: 'driver_id', nullable: true }) driverId: string;
  @Column({ name: 'site_id', nullable: true }) siteId: string;
  @Column() provider: string;
  @Column({ name: 'transacted_at', type: 'timestamptz' }) transactedAt: Date;
  @Column({ name: 'volume_l', type: 'numeric' }) volumeL: number;
  @Column({ name: 'unit_price_eur', type: 'numeric', nullable: true }) unitPriceEur: number;
  @Column({ name: 'total_eur', type: 'numeric' }) totalEur: number;
  @Column({ name: 'station_name', nullable: true }) stationName: string;
  @Column({ name: 'station_lat', type: 'numeric', nullable: true }) stationLat: number;
  @Column({ name: 'station_lng', type: 'numeric', nullable: true }) stationLng: number;
  @Column({ name: 'fraud_status', default: 'clear' }) fraudStatus: string;
  @Column({ name: 'external_id', nullable: true }) externalId: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
