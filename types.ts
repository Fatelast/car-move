
export interface ParkingConfig {
  startTime: number; // Timestamp in ms
  intervalMinutes: number; // e.g., 60 for 1 hour, 30 for 30 mins
  reminderMinutes: number; // e.g., 10 or 15 mins before cycle ends
  gracePeriodMinutes: number; // e.g., 15 mins free at start
  locationImage?: string; // Base64 string of the parking photo (compressed)
  locationName?: string; // Text description of the location
  cycleCost: number; // Cost per billing cycle in CNY
}

export interface ParkingState {
  isActive: boolean;
  config: ParkingConfig | null;
}

export enum ParkingStatus {
  SAFE = 'SAFE', // Plenty of time
  WARNING = 'WARNING', // Approaching reminder threshold
  DANGER = 'DANGER', // Very close to cycle end
  OVERTIME = 'OVERTIME', // Cycle passed (you are paying extra now)
}

export interface AIParsedRule {
  intervalMinutes: number;
  gracePeriodMinutes: number;
  explanation: string;
}

export interface ParkingRecord {
  id: string;
  startTime: number;
  endTime: number;
  locationName?: string;
  totalDurationMs: number;
  intervalMinutes: number;
  costCycleCount: number; // How many billing cycles were consumed
  cycleCost: number; // Cost per cycle
  totalCost: number; // Total calculated cost
}
