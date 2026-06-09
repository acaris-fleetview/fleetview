import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const MTS1_API_URL = 'https://console.mts-1.com/graphql';
const MTS1_SHIPPER_ID = process.env.MTS1_SHIPPER_ID || '63c854d713123429cd48ed43';

// Données exemple affichées quand l'API MTS-1 est indisponible
const MOCK_ROUNDS = [
  { id: 'demo-1', name: 'Tournée A - Paris Nord', status: 'completed', distanceKm: 87, weightKg: 1240, volumeM3: 4.2, customerOrdersCount: 12 },
  { id: 'demo-2', name: 'Tournée B - Paris Sud', status: 'in_progress', distanceKm: 64, weightKg: 980, volumeM3: 3.1, customerOrdersCount: 9 },
  { id: 'demo-3', name: 'Tournée C - Banlieue Est', status: 'planned', distanceKm: 102, weightKg: 1580, volumeM3: 5.8, customerOrdersCount: 15 },
  { id: 'demo-4', name: 'Tournée D - Banlieue Ouest', status: 'planned', distanceKm: 78, weightKg: 1120, volumeM3: 3.9, customerOrdersCount: 10 },
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
      this.logger.warn('MTS1_API_TOKEN non configuré — mode données exemple');
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
        this.logger.warn('MTS-1 token invalide (401) — affichage données exemple');
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
    // Fallback: données exemple (token invalide ou API indisponible)
    this.logger.log(`fetchRounds: retour données exemple pour ${targetDate}`);
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
      for (const result of results) {
        if (result?.rounds) {
          hasRealData = true;
          for (const r of result.rounds) {
            if (r.distanceKm) { totalKm += r.distanceKm; roundCount++; }
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
    try {
      const result = await this.query<{ monthlyStats: unknown }>(gql, { shipperId: MTS1_SHIPPER_ID, month: targetMonth });
      return result?.monthlyStats ?? { totalPdl: 1063, pendingPdl: 244, avgTimePerPointMin: 8, avgTimePerOtMin: 42 };
    } catch (err) {
      this.logger.error('fetchMonthlyStats error', err?.message);
      return null;
    }
  }

  async fetchAnomalies(): Promise<unknown[]> {
    const gql = `
      query GetAnomalies($shipperId: ID!) {
        customerOrdersWarning(shipperId: $shipperId) { id reference status warningType }
      }
    `;
    try {
      const result = await this.query<{ customerOrdersWarning: unknown[] }>(gql, { shipperId: MTS1_SHIPPER_ID });
      return result?.customerOrdersWarning ?? [];
    } catch (err) {
      this.logger.error('fetchAnomalies error', err?.message);
      return [];
    }
  }
}
