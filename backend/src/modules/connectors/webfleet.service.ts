import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';

/**
 * Webfleet Connector
 *
 * Webfleet propose deux interfaces :
 *  1. Fleet API REST (Bearer token, endpoint /fleet/...)
 *  2. Report Interface via CSV (legacy, paramètres query string)
 *
 * Ce service utilise la Fleet API REST (recommandée depuis 2022).
 * Documentations : https://www.webfleet.com/en_gb/webfleet/api/
 */
@Injectable()
export class WebfleetService {
  private readonly logger = new Logger(WebfleetService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private config: ConfigService,
  ) {}

  // ─── Authentification ────────────────────────────────────────────────────────
  private async getToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    const baseUrl = this.config.get('WEBFLEET_BASE_URL', 'https://api.webfleet.com');
    const resp = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: this.config.get('WEBFLEET_USERNAME'),
        password: this.config.get('WEBFLEET_PASSWORD'),
        client_id: this.config.get('WEBFLEET_API_KEY'),
        account_name: this.config.get('WEBFLEET_ACCOUNT'),
      }),
    });
    if (!resp.ok) throw new Error(`Webfleet auth failed: ${resp.status}`);
    const data = await resp.json();
    this.accessToken = data.access_token;
    // Expire 60s avant la durée réelle pour anticiper le renouvellement
    this.tokenExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);
    return this.accessToken;
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<any> {
    const baseUrl = this.config.get('WEBFLEET_BASE_URL', 'https://api.webfleet.com');
    const token = await this.getToken();
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (resp.status === 401) {
      // Forcer le renouvellement du token et réessayer une fois
      this.accessToken = null;
      const token2 = await this.getToken();
      const resp2 = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token2}`, Accept: 'application/json' },
      });
      if (!resp2.ok) throw new Error(`Webfleet API error: ${resp2.status} on ${path}`);
      return resp2.json();
    }
    if (!resp.ok) throw new Error(`Webfleet API error: ${resp.status} on ${path}`);
    return resp.json();
  }

  // ─── Véhicules ───────────────────────────────────────────────────────────────
  async fetchVehicles(): Promise<any[]> {
    const data = await this.apiGet('/fleet/vehicles');
    return Array.isArray(data) ? data : data.vehicles || [];
  }

  // ─── Positions temps réel ────────────────────────────────────────────────────
  async fetchPositions(): Promise<any[]> {
    const data = await this.apiGet('/fleet/vehicles/positions');
    return Array.isArray(data) ? data : data.positions || [];
  }

  // ─── Trajets ─────────────────────────────────────────────────────────────────
  async fetchTrips(from: Date, to: Date): Promise<any[]> {
    const data = await this.apiGet('/fleet/trips', {
      from: from.toISOString(),
      to: to.toISOString(),
    });
    return Array.isArray(data) ? data : data.trips || [];
  }

  // ─── Synchronisation planifiée (toutes les 2 minutes pour les positions) ─────
  @Cron('*/2 * * * *')
  async syncPositions() {
    try {
      const positions = await this.fetchPositions();
      this.logger.log(`Webfleet sync: ${positions.length} positions reçues`);
      // TODO: persister via TelemetryService (injecter si besoin)
    } catch (err) {
      this.logger.error(`Webfleet position sync failed: ${err.message}`);
    }
  }

  // ─── Synchronisation quotidienne des trajets ─────────────────────────────────
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async syncTrips() {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    try {
      const trips = await this.fetchTrips(from, to);
      this.logger.log(`Webfleet sync: ${trips.length} trajets reçus`);
    } catch (err) {
      this.logger.error(`Webfleet trips sync failed: ${err.message}`);
    }
  }
}
