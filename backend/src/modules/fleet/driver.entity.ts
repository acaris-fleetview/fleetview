import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'org_id' }) orgId: string;
  @Column({ name: 'last_name' }) lastName: string;
  @Column({ name: 'first_name' }) firstName: string;
  @Column({ nullable: true }) email: string;
  @Column({ nullable: true }) phone: string;
  @Column({ name: 'license_number', nullable: true }) licenseNumber: string;
  @Column({ name: 'license_expiry', type: 'date', nullable: true }) licenseExpiry: string;
  @Column({ name: 'driving_score', type: 'numeric', default: 100 }) drivingScore: number;
  @Column({ default: 'active' }) status: string;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
