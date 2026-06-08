import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FuelTransaction } from '../fuel/fuel-transaction.entity';

interface ImportResult {
  source: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(FuelTransaction) private fuelRepo: Repository<FuelTransaction>,
    private dataSource: DataSource,
  ) {}

  async importFuel(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'fuel', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    // Determine provider from records (all records in one import share the same provider)
    const provider = records[0]?.provider ?? 'Tankyou';

    // Delete existing records for this provider only (preserves other providers)
    await this.dataSource.query(
      `DELETE FROM fuel_transactions WHERE provider = $1 OR provider IS NULL`,
      [provider]
    );

    for (const r of records) {
      try {
        const tx = this.fuelRepo.create({
          vehicleId:    r.vehicleId,
          transactedAt: new Date(r.transactedAt),
          volumeL:      r.volumeL,
          unitPriceEur: r.unitPriceEur,
          totalEur:     r.totalEur,
          fuelType:     r.fuelType ?? 'Gasoil',
          provider:     r.provider ?? 'Tankyou',
          stationName:  r.stationName ?? r.location ?? null,
          stationName:  r.location ?? null,
        } as any);
        await this.fuelRepo.save(tx);
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importTotalMobility(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'total-mobility', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_total_mobility (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE,
        description TEXT,
        quantity NUMERIC,
        unit_price_eur NUMERIC,
        total_eur NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_total_mobility`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_total_mobility (date, description, quantity, unit_price_eur, total_eur) VALUES ($1,$2,$3,$4,$5)`,
          [r.date, r.description, r.quantity, r.unitPriceEur, r.totalEur]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importMaintenance(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'maintenance', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_maintenance (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vehicle_id TEXT,
        date DATE,
        type TEXT,
        cost_eur NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_maintenance`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_maintenance (vehicle_id, date, type, cost_eur) VALUES ($1,$2,$3,$4)`,
          [r.vehicleId, r.date, r.type, r.costEur]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importInsurance(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'insurance', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_insurance (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vehicle_id TEXT,
        marque TEXT,
        annual_premium_eur NUMERIC,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_insurance`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_insurance (vehicle_id, marque, annual_premium_eur, start_date, end_date) VALUES ($1,$2,$3,$4,$5)`,
          [r.vehicleId, r.marque, r.annualPremiumEur, r.startDate, r.endDate]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importRental(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'rental', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_rental (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vehicle_id TEXT,
        date DATE,
        supplier TEXT,
        model TEXT,
        days INTEGER,
        rental_eur NUMERIC,
        insurance_eur NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_rental`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_rental (vehicle_id, date, supplier, model, days, rental_eur, insurance_eur) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.vehicleId, r.date, r.supplier, r.model, r.days, r.rentalEur, r.insuranceEur]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importInfractions(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'infractions', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_infractions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        date DATE,
        type TEXT,
        driver TEXT,
        amount_eur NUMERIC,
        imputation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_infractions`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_infractions (date, type, driver, amount_eur, imputation) VALUES ($1,$2,$3,$4,$5)`,
          [r.date, r.type, r.driver, r.amountEur, r.imputation]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }

  async importDepreciation(records: any[]): Promise<ImportResult> {
    const result: ImportResult = { source: 'depreciation', inserted: 0, skipped: 0, errors: [] };
    if (!records?.length) return result;

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS import_depreciation (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vehicle_id TEXT,
        purchase_date DATE,
        purchase_price_eur NUMERIC,
        net_value_eur NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await this.dataSource.query(`DELETE FROM import_depreciation`);

    for (const r of records) {
      try {
        await this.dataSource.query(
          `INSERT INTO import_depreciation (vehicle_id, purchase_date, purchase_price_eur, net_value_eur) VALUES ($1,$2,$3,$4)`,
          [r.vehicleId, r.purchaseDate, r.purchasePriceEur, r.netValueEur]
        );
        result.inserted++;
      } catch (e: any) {
        result.skipped++;
        if (result.errors.length < 5) result.errors.push(e.message);
      }
    }
    return result;
  }
}
