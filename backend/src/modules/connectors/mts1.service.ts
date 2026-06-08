import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const MTS1_API_URL = 'https://console.mts-1.com/graphql';
const MTS1_SHIPPER_ID = process.env.MTS1_SHIPPER_ID || '63c854d713123429cd48ed43';

@Injectable()
export class Mts1Service {
  private readonly logger = new Logger(Mts1Service.name);

  constructor(private http: HttpService) {}

  private getToken(): string {
    return process.env.MTS1_API_TOKEN || '';
  }

  private async query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
    const token = this.getToken();
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
    }
    return data.data;
  }

  async fetchRounds(date?: string): Promise<unknown> {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const gql = `
      query GetRounds($shipperId: ID!, $date: String!) {
        rounds(shipperId: $shipperId, date: $date) {
          id name status distanceKm weightKg volumeM3 depot customerOrdersCount startedAt completedAt
        }
      }
    `;
    try {
      const result = await this.query<{ rounds: unknown[] }>(gql, { shipperId: MTS1_SHIPPER_ID, date: targetDate });
      return result?.rounds ?? [];
    } catch (err) {
      this.logger.error('fetchRounds error', err?.message);
      return [];
    }
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
    for (let i = 1; i <= daysInMonth; i += 5) {
      const batch = [];
      for (let j = i; j < i + 5 && j <= daysInMonth; j++) {
        const day = String(j).padStart(2, '0');
        batch.push(
          this.query<{ rounds: Array<{ id: string; distanceKm: number }> }>(gql, {
            shipperId: MTS1_SHIPPER_ID, date: `${targetMonth}-${day}`
          }).catch(() => ({ rounds: [] }))
        );
      }
      const results = await Promise.all(batch);
      for (const result of results) {
        for (const r of (result?.rounds ?? [])) {
          if (r.distanceKm) { totalKm += r.distanceKm; roundCount++; }
        }
      }
    }
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
      return result?.monthlyStats ?? null;
    } catch (err) {
      this.logger.error('fetchMonthlyStats error', err?.message);
      return null;
    }
  }

  async fetchAnomalies(): Promise<unknown> {
    const gql = `
      query GetAnomalies($shipperId: ID!) {
        customerOrdersWarning(shipperId: $shipperId) { id reference status warningType customerName }
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
