import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const MTS1_API_URL = 'https://console.mts-1.com/graphql';
const MTS1_TOKEN = process.env.MTS1_API_TOKEN || 'cf598c4da6fdd724eabae541c7ad7c02273e1739fe9761dfeb6263941d0dd6699d480a1ae9ad912be17d0d4b470725dccf18fed04ab89b935105400d';
const MTS1_SHIPPER_ID = process.env.MTS1_SHIPPER_ID || '63c854d713123429cd48ed43';

@Injectable()
export class Mts1Service {
  private readonly logger = new Logger(Mts1Service.name);

  constructor(private http: HttpService) {}

  private async query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
    const { data } = await firstValueFrom(
      this.http.post<{ data: T; errors?: unknown[] }>(
        MTS1_API_URL,
        { query: gql, variables },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${MTS1_TOKEN}`,
          },
        },
      ),
    );
    if (data.errors?.length) {
      this.logger.error('MTS-1 GraphQL errors', JSON.stringify(data.errors));
    }
    return data.data;
  }

  /** Tournées du jour (rounds) */
  async fetchRounds(date?: string): Promise<unknown> {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const gql = `
      query GetRounds($shipperId: ID!, $date: String!) {
        rounds(shipperId: $shipperId, date: $date) {
          id
          name
          status
          distanceKm
          weightKg
          volumeM3
          depot
          customerOrdersCount
          startedAt
          completedAt
        }
      }
    `;
    try {
      const result = await this.query<{ rounds: unknown[] }>(gql, {
        shipperId: MTS1_SHIPPER_ID,
        date: targetDate,
      });
      return result?.rounds ?? [];
    } catch (err) {
      this.logger.error('fetchRounds error', err?.message);
      return [];
    }
  }

  /** Stats mensuelles avec distanceKm */
  async fetchMonthlyStats(month?: string): Promise<unknown> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    // Try with totalDistanceKm first, fallback without if field doesn't exist
    const gql = `
      query GetMonthlyStats($shipperId: ID!, $month: String!) {
        monthlyStats(shipperId: $shipperId, month: $month) {
          totalPdl
          pendingPdl
          avgTimePerPointMin
          avgTimePerOtMin
          totalDistanceKm
        }
      }
    `;
    try {
      const result = await this.query<{ monthlyStats: unknown }>(gql, {
        shipperId: MTS1_SHIPPER_ID,
        month: targetMonth,
      });
      return result?.monthlyStats ?? null;
    } catch (err) {
      this.logger.error('fetchMonthlyStats error', err?.message);
      // Fallback without totalDistanceKm
      try {
        const gqlFallback = `
          query GetMonthlyStats($shipperId: ID!, $month: String!) {
            monthlyStats(shipperId: $shipperId, month: $month) {
              totalPdl
              pendingPdl
              avgTimePerPointMin
              avgTimePerOtMin
            }
          }
        `;
        const result2 = await this.query<{ monthlyStats: unknown }>(gqlFallback, {
          shipperId: MTS1_SHIPPER_ID,
          month: targetMonth,
        });
        return result2?.monthlyStats ?? null;
      } catch {
        return null;
      }
    }
  }

  /** KM parcourus sur un mois — somme des distanceKm de tous les rounds du mois */
  async fetchMonthlyKm(month?: string): Promise<{ totalKm: number; roundCount: number }> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, mon] = targetMonth.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    let totalKm = 0;
    let roundCount = 0;

    // Fetch rounds for each day of the month in parallel (batches of 10)
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${targetMonth}-${String(d).padStart(2, '0')}`);
    }

    const gql = `
      query GetRounds($shipperId: ID!, $date: String!) {
        rounds(shipperId: $shipperId, date: $date) {
          distanceKm
        }
      }
    `;

    // Process in batches of 5 to avoid overwhelming the API
    for (let i = 0; i < dates.length; i += 5) {
      const batch = dates.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(date =>
          this.query<{ rounds: { distanceKm: number }[] }>(gql, {
            shipperId: MTS1_SHIPPER_ID,
            date,
          })
        )
      );
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.rounds) {
          for (const round of res.value.rounds) {
            if (round.distanceKm) {
              totalKm += round.distanceKm;
              roundCount++;
            }
          }
        }
      }
    }

    return { totalKm: Math.round(totalKm), roundCount };
  }

  /** Anomalies non traitées */
  async fetchAnomalies(): Promise<unknown> {
    const gql = `
      query GetAnomalies($shipperId: ID!) {
        customerOrdersWarning(shipperId: $shipperId) {
          id
          reference
          status
          warningType
          customerName
        }
      }
    `;
    try {
      const result = await this.query<{ customerOrdersWarning: unknown[] }>(gql, {
        shipperId: MTS1_SHIPPER_ID,
      });
      return result?.customerOrdersWarning ?? [];
    } catch (err) {
      this.logger.error('fetchAnomalies error', err?.message);
      return [];
    }
  }
}
