import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('fraud_alerts')
export class FraudAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'transaction_id' }) transactionId: string;
  @Column({ name: 'alert_type' }) alertType: string;
  @Column({ name: 'risk_score', type: 'numeric' }) riskScore: number;
  @Column() description: string;
  @Column({ default: 'open' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date;
}
