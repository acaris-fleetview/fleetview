export interface Vehicle {
  id: string; orgId: string; siteId?: string;
  registration: string; brand?: string; model?: string; year?: number;
  fuelType?: string; tankCapacityL?: number; status: 'active'|'inactive'|'archived';
  odometerKm: number; webfleetObjectUid?: string; createdAt: string;
}

export interface Driver {
  id: string; orgId: string;
  lastName: string; firstName: string; email?: string; phone?: string;
  licenseNumber?: string; drivingScore: number; status: 'active'|'inactive';
}

export interface Trip {
  id: string; vehicleId: string; driverId?: string;
  startedAt: string; endedAt?: string; distanceKm?: number; durationMin?: number;
  fuelL?: number; co2Kg?: number; drivingScore?: number;
  startAddress?: string; endAddress?: string;
}

export interface FuelTransaction {
  id: string; vehicleId?: string; provider: string;
  transactedAt: string; volumeL: number; unitPriceEur?: number;
  totalEur: number; stationName?: string; fraudStatus: 'clear'|'suspect'|'confirmed_fraud';
}

export interface FraudAlert {
  id: string; transactionId: string; alertType: string;
  riskScore: number; description: string; status: 'open'|'acknowledged'|'false_positive';
  createdAt: string;
}

export interface KpiTelemetry {
  totalKm: number; totalFuelL: number; totalCo2Kg: number;
  tripCount: number; avgDrivingScore: number;
}

export interface KpiFuel {
  totalCostEur: number; totalVolumeL: number; transactionCount: number;
  avgPriceEur: number; openFraudAlerts: number;
}

export interface FleetStats {
  total: number; active: number; inactive: number; archived: number;
}

export interface VehiclePosition {
  objectUid: string; vehicleId?: string; registration?: string;
  lat: number; lng: number; speedKmh?: number; recordedAt: string;
}
