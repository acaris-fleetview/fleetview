import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TankyouService {
  private readonly logger = new Logger(TankyouService.name);

  constructor(private config: ConfigService) {}

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<any> {
    const baseUrl = this.config.get('TANKYOU_BASE_URL', 'https://api.tankyou.fr/v1');
    const apiKey = this.config.get('TANKYOU_API_KEY');
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const resp = await fetch(url.toString(), {
      headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
    });
    if (!resp.ok) throw new Error(`Tankyou API error: ${resp.status} on ${path}`);
    return resp.json();
  }

  async fetchTransactions(from: Date, to: Date): Promise<any[]> {
    const data = await this.apiGet('/transactions', {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    });
    return Array.isArray(data) ? data : data.transactions || [];
  }

  @Cron('0 2 * * *') // 02h00 chaque nuit
  async syncTransactions() {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    try {
      const transactions = await this.fetchTransactions(from, to);
      this.logger.log(`Tankyou sync: ${transactions.length} transactions reçues`);
    } catch (err) {
      this.logger.error(`Tankyou sync failed: ${err.message}`);
    }
  }
}
