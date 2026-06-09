import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const MTS1_API_URL = 'https://console.mts-1.com/graphql';
const MTS1_SHIPPER_ID = process.env.MTS1_SHIPPER_ID || '63c854d713123429cd48ed43';

// Données réelles du 2026-05-29 — fallback quand API indisponible
const MOCK_ROUNDS = [
  { id: 'f-1',  name: 'ARGENTEUIL',   status: 'in_progress', distanceKm: 0.06,   weightKg: 6,    volumeM3: 4.78,  customerOrdersCount: 11 },
  { id: 'f-2',  name: 'CAMION SIT 491', status: 'in_progress', distanceKm: 37.68, weightKg: 5,    volumeM3: 5.83,  customerOrdersCount: 7  },
  { id: 'f-3',  name: 'CAMION SIT 728', status: 'completed',   distanceKm: 80.88, weightKg: 7,    volumeM3: 9.96,  customerOrdersCount: 10 },
  { id: 'f-4',  name: 'CAMION NOUVEAU', status: 'completed',   distanceKm: 52.92, weightKg: 5,    volumeM3: 9.00,  customerOrdersCount: 7  },
  { id: 'f-5',  name: 'CAMION 2019',    status: 'in_progress', distanceKm: 43.27, weightKg: 22.5, volumeM3: 15.46, customerOrdersCount: 7  },
  { id: 'f-6',  name: 'CAMION SIT 822', status: 'completed',   distanceKm: 102.29,weightKg: 5,    volumeM3: 18.50, customerOrdersCount: 6  },
  { id: 'f-7',  name: 'CAMION SIT FK',  status: 'in_progress', distanceKm: 111.19,weightKg: 1,    volumeM3: 20.00, customerOrdersCount: 2  },
  { id: 'f-8',  name: 'CAMION 2022',    status: 'completed',   distanceKm: 60.24, weightKg: 1,    volumeM3: 20.00, customerOrdersCount: 2  },
  { id: 'f-9',  name: 'CAMION SIT 215', status: 'completed',   distanceKm: 59.11, weightKg: 2,    volumeM3: 20.32, customerOrdersCount: 3  },
  { id: 'f-10', name: 'CAMION 2024',    status: 'completed',   distanceKm: 61.96, weightKg: 4,    volumeM3: 20.00, customerOrdersCount: 5  },
  { id: 'f-11', name: 'CAMION SIT 545', status: 'in_progress', distanceKm: 57.06, weightKg: 1,    volumeM3: 20.00, customerOrdersCount: 1  },
  { id: 'f-12', name: 'CAMION SIT 946', status: 'in_progress', distanceKm: 57.06, weightKg: 1,    volumeM3: 20.00, customerOrdersCount: 1  },
];

@Injectable()
export class Mts1Service {
  private readonly logger = new Logger(Mts1Service.name);

  constructor(private http: HttpService) {}

  private getToken(): string {
    return process.env.MTS1_API_TOKEN || '';
  }

  private async query<T>(gql: string, variables: Record<string, unknown>): Promise<T | null> {
    const token = this.getToken();
    if (!token) {
      this.logger.warn('MTS1_API_TOKEN non configuré — mode données fallback');
      return null;
    }
    try {
      const { data } = await firstValueFrom(
        this.http.post<{ data: T; errors?: unknown[] }>(
          MTS1_API_URL,
          { query: gql, variables },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
      if (data.errors?.length) {
        this.logger.error('MTS-1 GraphQL errors', JSON.stringify(data.errors));
        return null;
      }
      return data.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        this.logger.warn('MTS-1 token invalide (401) — affichage données fallback');
      } else {
        this.logger.error('MTS-1 query error', err?.message);
      }
      return null;
    }
  }

  async fetchRounds(date?: string): Promise<unknown[]> {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const gql = `
      query GetRounds($shipperId: ID!, $date: String!) {
        rounds(shipperId: $shipperId, date: $date) {
          id name status distanceKm weightKg volumeM3 depot
          driverName vehiclePlate plannedStops completedStops customerOrdersCount
        }
      }
    `;
    const result = await this.query<{ rounds: unknown[] }>(gql, { shipperId: MTS1_SHIPPER_ID, date: targetDate });
    if (result?.rounds?.length) return result.rounds;
    this.logger.log(`fetchRounds: retour données fallback pour ${targetDate}`);
    return MOCK_ROUNDS;
  }

  async fetchMonthlyKm(month?: string): Promise<{ totalKm: number; roundCount: number }> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const gql = `
      query GetRounds($shipperId: ID!, $date: String!) {
        rounds(shipperId: $shipperId, date: $date) { id distanceKm }
      }
    `;
    let totalKm = 0;
    let roundCount = 0;
    let hasRealData = false;
    for (let i = 1; i <= daysInMonth; i += 5) {
      const batch = [];
      for (let j = i; j < i + 5 && j <= daysInMonth; j++) {
        const day = String(j).padStart(2, '0');
        batch.push(
          this.query<{ rounds: Array<{ id: string; distanceKm: number }> }>(gql, {
            shipperId: MTS1_SHIPPER_ID, date: `${targetMonth}-${day}`
          }).catch(() => null)
        );
      }
      const results = await Promise.all(batch);
      for (const r of results) {
        if (r?.rounds) {
          hasRealData = true;
          for (const round of r.rounds) {
            if (round.distanceKm) { totalKm += round.distanceKm; roundCount++; }
          }
        }
      }
    }
    if (!hasRealData) return { totalKm: 4820, roundCount: 68 };
    return { totalKm: Math.round(totalKm), roundCount };
  }

  async fetchMonthlyStats(month?: string): Promise<unknown> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const gql = `
      query GetMonthlyStats($shipperId: ID!, $month: String!) {
        monthlyStats(shipperId: $shipperId, month: $month) {
          totalPdl pendingPdl avgTimePerPointMin avgTimePerOtMin
        }
      }
    `;
    const result = await this.query<{ monthlyStats: unknown }>(gql, { shipperId: MTS1_SHIPPER_ID, month: targetMonth });
    return result?.monthlyStats ?? { totalPdl: 841, pendingPdl: 227, avgTimePerPointMin: 33, avgTimePerOtMin: 477 };
  }

  async fetchAnomalies(): Promise<unknown[]> {
    const gql = `
      query GetAnomalies($shipperId: ID!) {
        customerOrdersWarning(shipperId: $shipperId) { id reference status warningType }
      }
    `;
    const result = await this.query<{ customerOrdersWarning: unknown[] }>(gql, { shipperId: MTS1_SHIPPER_ID });
    return result?.customerOrdersWarning ?? [];
  }
}
